# iTAG mock

Mock do `iTAG Monitor` (app Windows proprietário do leitor RFID) que escuta em
`http://127.0.0.1:9093` e responde o mesmo protocolo. Pra desenvolvimento em
Linux/macOS onde o iTAG Monitor não roda.

## Rodar

```sh
bun run tools/itag-mock/server.ts
```

Em outro terminal, rode o app:

```sh
bun run tauri dev
```

Settings → Leitor RFID → **Testar conexão** deve ficar verde.

## Comportamento

State machine simplificada que imita o iTAG real:

- `iniciar` → começa "scan"; após 200ms popula o buffer com os EPCs seed
- `parar` → para o scan (não limpa buffer)
- `limparLeitura` → esvazia o buffer
- `RetornaTag` → retorna `JSON.stringify([...buffer])`

Resultado: depois de chamar `iniciar`, o `poll_tags` do app passa a ver os EPCs
configurados. Re-inventory (`parar` → `limparLeitura` → `iniciar`) também
funciona.

## Variáveis de ambiente

| Var | Default | Descrição |
|---|---|---|
| `ITAG_MOCK_PORT` | `9093` | Porta HTTP |
| `ITAG_MOCK_EPCS` | 3 EPCs sample | CSV de EPCs hex que aparecem após `iniciar` |

Exemplo com EPCs próprios:

```sh
ITAG_MOCK_EPCS="ABCD1234,DEAD0001,DEAD0002" bun run tools/itag-mock/server.ts
```

## Limitações

- Não simula tag entrando/saindo do alcance do leitor — só populates uma vez no
  start. Se você precisar de "novos EPCs ao longo do tempo" pra testar UX de
  leitura contínua, ajustar o `setTimeout` em `server.ts` pra adicionar EPCs em
  tickets ao longo do tempo.
- Não há latência simulada nas respostas (iTAG real responde em ~5-30ms).
