# V1 role and permission matrix

Users may hold more than one tenant role. Tenant Admin access applies to the entire tenant. Other permissions require a process access rule or an implicit relationship as Guardian, Process Owner, Contributor, Approver, or Auditor.

| Role               | View                   | Design                     | Comment        | Evidence          | Audit             | Issues             | Approve release               | Manage release | Manage access |
| ------------------ | ---------------------- | -------------------------- | -------------- | ----------------- | ----------------- | ------------------ | ----------------------------- | -------------- | ------------- |
| Tenant Admin       | All                    | All drafts                 | Yes            | Yes               | Yes               | Yes                | When assigned                 | Yes            | Yes           |
| Process Guardian   | Permitted/assigned     | Editable drafts            | Yes            | Yes               | Yes               | Yes                | Only when separately assigned | Yes            | No            |
| Process Owner      | Owned/permitted        | No                         | Yes            | Yes               | Respond           | Respond            | Only when separately assigned | Acknowledge    | No            |
| Contributor        | Permitted/assigned     | No                         | Yes            | Yes               | No                | Assigned responses | No                            | No             | No            |
| Approver           | Assigned/permitted     | No                         | Approval notes | Approval evidence | No                | View               | Assigned current revision     | Review         | No            |
| Viewer             | Permitted              | No                         | No             | No                | No                | No                 | No                            | View           | No            |
| Auditor            | Permitted              | No                         | Audit comments | Yes               | Configured audits | Create findings    | No                            | View           | No            |
| Emilda Super Admin | Platform metadata only | No automatic tenant access | No             | No                | No                | No                 | No                            | Provisioning   | Platform      |

Super Admin client-data access requires a named, time-bounded support grant with a reason. The grant is visible to the tenant and creates an activity event.

Approved or approval-pending content cannot be designed by any role. A Guardian starts a new version with a required change reason instead.
