---
name: dependency-and-approval-contract
description: "Trace recalculation, approval, and build readiness across document sections."
---

Trace Section 02 revenue from quantity, price, and rule version; Section 03 cost from revenue and rate; Section 04 profit from revenue and cost; and Section 05 conclusion from profit. Verify transitive stale propagation, blocked single-section execution when upstream results are stale, affected execution, and forced full execution. Recomputed results require approval. Builds require zero stale results and zero pending approvals. Input changes, recipe saves, execution, and layout simulation changes invalidate the current build. Distinguish current implementation behavior from any newly requested contract.
