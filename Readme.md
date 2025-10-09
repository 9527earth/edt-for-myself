1.手搓节点格式：

| vless://<UUID>@<服务器地址>:<端口>?encryption=none&security=tls&sni=<域名>&allowInsecure=1&&type=ws&host=<域名>&path=<路径>#<备注> |

2.代码中的参数说明

| 参数     | 说明                           |
| ------ | ---------------------------- |
| `U`    | UUID（必须为标准 VLESS UUID）       |
| `P`    | fallback 代理 IP:Port（直连失败时使用） |
| `S5`   | SOCKS5 地址，可留空                |
| `GS5`  | 是否启用全局 SOCKS5 模式             |
| `mode` | 数据传输模式：1=管道传输-快、2=队列传输-稳            |
| `VER`  | 仅作版本区分，无实际逻辑影响               |

3.你可以在客户端（V2Ray / Clash 等）里配置 WebSocket 的 path，像这样：

🔹 示例 1：只使用默认配置
/


表示完全使用 Worker 文件顶部定义的 P, S5, GS5 参数。

🔹 示例 2：自定义 fallback 代理 IP
/?p=fra.o00o.ooo:443


会临时覆盖顶部 const P，直连失败后走该新代理。

🔹 示例 3：指定 SOCKS5 代理
/?s5=user:pass@1.2.3.4:1080


表示仅启用指定 SOCKS5 作为备用代理。

🔹 示例 4：全局 SOCKS5 模式（强制所有连接走 SOCKS5）
/?s5=1.2.3.4:1080&gs5=1


即使直连可用，也会强制通过 SOCKS5。

🔹 示例 5：多参数组合
/?p=fra.o00o.ooo:443&s5=user:pass@1.2.3.4:1080&gs5=false


可同时指定多个参数，系统自动解析优先级。
