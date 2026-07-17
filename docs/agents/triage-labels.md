# Triage Labels

The engineering skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's GitHub issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Create these labels on `Ditto190/modme-ui-01` if they do not exist yet:

```powershell
gh label create needs-triage --repo Ditto190/modme-ui-01 --color BFD4F2 --description "Maintainer needs to evaluate"
gh label create needs-info --repo Ditto190/modme-ui-01 --color FEF2C0 --description "Waiting on reporter"
gh label create ready-for-agent --repo Ditto190/modme-ui-01 --color 0E8A16 --description "AFK agent can pick up"
gh label create ready-for-human --repo Ditto190/modme-ui-01 --color C2E0C6 --description "Needs human implementation"
gh label create wontfix --repo Ditto190/modme-ui-01 --color FFFFFF --description "Will not be actioned"
```

Edit the right-hand column to match whatever vocabulary you actually use.
