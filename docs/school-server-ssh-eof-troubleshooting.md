# 学校服务器 SSH EOF 排查清单

## 症状

当前连接学校服务器时，表现为：

- TCP 连接建立成功
- 一进入 SSH session 就立刻断开
- 客户端日志常见表现：
  - `end of file`
  - `kex_exchange_identification: Connection closed by remote host`

这说明问题通常不在：

- IP 是否正确
- 端口是否完全没开

而更可能在：

- `4422` 端口后面的监听服务不是稳定的 `sshd`
- `sshd` 在握手早期就主动关闭连接
- SSH 配置、来源限制、封禁策略或端口映射存在问题

## 目标

通过服务器侧检查，快速判断下面哪一类问题：

1. `4422` 到底是不是 `sshd`
2. `sshd` 是否正常运行
3. `sshd_config` 是否有来源限制或认证限制
4. 是否被 `fail2ban`、防火墙或其它安全策略提前断开
5. 是否是端口映射或反向代理配置错误

## 一、先确认 4422 到底是谁在监听

在服务器控制台执行：

```bash
ss -lntp | grep 4422
```

如果系统没有 `ss`，再试：

```bash
netstat -lntp 2>/dev/null | grep 4422
```

### 你应该重点看

- `4422` 是否确实在监听
- 监听进程是否是 `sshd`

### 正常情况

应该看到类似：

```text
LISTEN 0 128 0.0.0.0:4422 ... users:(("sshd",pid=...,fd=...))
```

### 异常情况

- 没有输出：说明 `4422` 根本没人监听
- 不是 `sshd`：说明端口被别的程序占用或映射错了

## 二、确认 sshd 是否真的在运行

执行：

```bash
ps -ef | grep [s]shd
```

### 正常情况

应该至少看到主进程和可能的子进程。

### 异常情况

- 没有 `sshd`：说明服务没启动
- 频繁重启：说明配置或环境异常

## 三、查看 SSH 服务最近日志

先执行：

```bash
sudo journalctl -u ssh -u sshd -n 100 --no-pager
```

如果是 Debian/Ubuntu，还建议查：

```bash
sudo tail -n 100 /var/log/auth.log
```

如果是 CentOS/RHEL，还建议查：

```bash
sudo tail -n 100 /var/log/secure
```

### 重点看这些关键词

- `Connection closed`
- `banner exchange`
- `kex`
- `no matching`
- `refused`
- `too many unauthenticated connections`
- `user lei not allowed`
- `bad configuration option`
- `error reading SSH protocol banner`

### 常见含义

- `Connection closed before authentication`
  - 握手前被策略或服务异常中断
- `no matching key exchange method`
  - SSH 算法不兼容
- `user lei not allowed`
  - `AllowUsers` 或 `Match` 限制了用户
- `too many unauthenticated connections`
  - `MaxStartups` 触发限制

## 四、检查 sshd 配置

执行：

```bash
sudo grep -nE '^(Port|ListenAddress|AllowUsers|DenyUsers|PasswordAuthentication|PubkeyAuthentication|PermitRootLogin|Match|MaxStartups|Banner|KexAlgorithms|HostKeyAlgorithms)' /etc/ssh/sshd_config
```

如果使用了 include，再查：

```bash
sudo grep -nR '' /etc/ssh/sshd_config.d 2>/dev/null
```

### 重点检查

- `Port 4422` 是否真的配置了
- 是否存在 `AllowUsers` / `DenyUsers`
- 是否存在 `Match Address` / `Match User`
- `PasswordAuthentication` 是否被禁用
- 是否有过于激进的 `MaxStartups`
- 是否指定了不兼容的 `KexAlgorithms`

### 高风险配置

例如：

```text
AllowUsers otheruser
Match Address 某个来源网段
PasswordAuthentication no
MaxStartups 1:1:1
```

这些都可能导致当前连接行为异常。

## 五、检测 sshd 配置是否本身有问题

执行：

```bash
sudo sshd -t
```

### 正常情况

- 没有输出，返回成功

### 异常情况

- 会直接报配置错误

如果有报错，先修配置，再重启 SSH。

## 六、检查是否被 fail2ban 或安全策略拦截

如果装了 `fail2ban`：

```bash
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

### 重点看

- 当前是否存在 `sshd` jail
- `lei` 来源 IP 是否被封

如果怀疑被封，可以临时解封来源 IP。

## 七、检查防火墙规则

如果是 `ufw`：

```bash
sudo ufw status verbose
```

如果是 `firewalld`：

```bash
sudo firewall-cmd --list-all
```

如果是直接用 `iptables/nft`：

```bash
sudo iptables -S
sudo nft list ruleset
```

### 重点看

- 是否允许 `4422/tcp`
- 是否只对白名单来源开放
- 是否存在对某些来源的 drop/reject

## 八、如果 4422 不是 sshd，查端口映射

如果 `4422` 不是 `sshd` 直接监听，而是由其它程序映射或转发：

- 检查是否有 `nginx stream`
- 检查是否有 `haproxy`
- 检查是否有 `frp`
- 检查是否有 `iptables REDIRECT`
- 检查是否有 Docker 端口映射

可执行：

```bash
sudo grep -nR '4422' /etc/nginx /etc/haproxy /etc 2>/dev/null
docker ps --format 'table {{.ID}}\t{{.Image}}\t{{.Ports}}'
sudo iptables -t nat -S
```

### 重点判断

- `4422` 是否被转发到了错误目标
- 转发目标是否已经失效

## 九、最快修复路线

推荐按这个顺序处理：

1. `ss -lntp | grep 4422`
2. `ps -ef | grep [s]shd`
3. `sudo sshd -t`
4. `sudo journalctl -u ssh -u sshd -n 100 --no-pager`
5. `sudo grep -nE ... /etc/ssh/sshd_config`
6. `sudo fail2ban-client status sshd`
7. `sudo ufw status verbose` 或对应防火墙命令

## 十、处理建议

### 情况 A：4422 不是 sshd

处理：

- 修正端口占用或映射
- 确保 `sshd` 真正在 `4422` 监听

### 情况 B：sshd 配置错误

处理：

- 修复 `/etc/ssh/sshd_config`
- 执行 `sudo sshd -t`
- 然后重启 SSH

示例：

```bash
sudo systemctl restart sshd || sudo systemctl restart ssh
```

### 情况 C：来源限制/封禁

处理：

- 调整 `AllowUsers` / `Match Address`
- 解封 `fail2ban`
- 放开防火墙对来源 IP 的限制

### 情况 D：算法或握手兼容问题

处理：

- 先恢复默认安全算法
- 去掉过于激进的 `KexAlgorithms` 或 `HostKeyAlgorithms`

## 十一、修复后验证

修完后，先在服务器本机看：

```bash
ss -lntp | grep 4422
```

然后再从客户端验证：

```bash
ssh -vvv -p 4422 lei@27.188.65.247
```

理想情况应该从：

- `Connection established`

继续推进到：

- 收到远端 banner
- 进入认证阶段
- 提示输入密码或开始密钥认证

只要能进入认证阶段，就说明最关键的问题已经修复。

## 十二、需要我继续帮你判断时，优先把这三段输出给我

```bash
ss -lntp | grep 4422
sudo journalctl -u ssh -u sshd -n 100 --no-pager
sudo grep -nE '^(Port|ListenAddress|AllowUsers|DenyUsers|PasswordAuthentication|PubkeyAuthentication|Match|MaxStartups|KexAlgorithms|HostKeyAlgorithms)' /etc/ssh/sshd_config
```

有这三段，我基本就能继续帮你精确判断是哪一类问题，以及该改哪一处。
