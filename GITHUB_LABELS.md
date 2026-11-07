# GitHub labels

Create these labels in the repository (Issues, Labels, New label), or with the GitHub CLI using the commands below.

| Label | Color | Description |
|---|---|---|
| accessibility | `0e8a16` | Keyboard, screen reader, contrast, zoom, or other access needs |
| backup-and-restore | `1d76db` | Export, import, migration, storage recovery |
| bug | `d73a4a` | Something does not work as intended |
| documentation | `0075ca` | README, guides, in-app wording |
| enhancement | `a2eeef` | New feature or improvement |
| good-first-issue | `7057ff` | Small, well-defined, good for new contributors |
| help-wanted | `008672` | Maintainers would welcome help |
| privacy | `b60205` | Data handling, what leaves the device, sensitive information |
| printing | `5319e7` | Printed packet and print layout |
| security | `ee0701` | Hardening and non-sensitive security work (report vulnerabilities privately) |
| survivor-experience | `fbca04` | What the family sees and reads |
| testing | `c5def5` | Automated or manual tests |
| user-experience | `d4c5f9` | Flows, layout, wording, overwhelm |

```sh
gh label create accessibility --color 0e8a16 --description "Keyboard, screen reader, contrast, zoom, or other access needs"
gh label create backup-and-restore --color 1d76db --description "Export, import, migration, storage recovery"
gh label create bug --color d73a4a --description "Something does not work as intended" --force
gh label create documentation --color 0075ca --description "README, guides, in-app wording" --force
gh label create enhancement --color a2eeef --description "New feature or improvement" --force
gh label create good-first-issue --color 7057ff --description "Small, well-defined, good for new contributors"
gh label create help-wanted --color 008672 --description "Maintainers would welcome help"
gh label create privacy --color b60205 --description "Data handling, what leaves the device, sensitive information"
gh label create printing --color 5319e7 --description "Printed packet and print layout"
gh label create security --color ee0701 --description "Hardening and non-sensitive security work"
gh label create survivor-experience --color fbca04 --description "What the family sees and reads"
gh label create testing --color c5def5 --description "Automated or manual tests"
gh label create user-experience --color d4c5f9 --description "Flows, layout, wording, overwhelm"
```
