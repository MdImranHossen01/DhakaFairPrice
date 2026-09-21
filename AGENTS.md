<!-- BEGIN:nextjs-agent-rules -->
# Multi-Version E-Commerce Platform Implementation Guide

This project is a multi-version and multi tenant e-commerce platform. It is designed to customize storefronts for different clients by selecting and combining specific versions of UI components (such as Navbar V1-V6, Footer V1-V6, and Product Card V1-V6).

## 1. Project Architecture
- **Component Versioning:** The platform supports multiple versions (V1 to V6) of core UI components:
  - **Navbars:** V1 - V6
  - **Footers:** V1 - V6
  - **Product Cards:** V1 - V6
- **Client Selection:** Each client uses a specific version of these components to customize their storefront.
- **Registry Pattern:** Variations are registered and selected dynamically. Always follow the established registration pattern when adding or modifying component versions.

## 2. Visual Identity & Styling
- **Dynamic Themes:** Always use CSS variables (defined in `src/app/theme.css`) for branding and styling. Do not hardcode hex codes or color names directly.
- **Strict Dynamic Theming & Typography:** No hardcoded static color classes (e.g., `bg-emerald-950`, `text-emerald-400`) or hardcoded fonts may be used in layout templates or component screens. All custom components and pages must reference theme-relative classes or variables (e.g. `bg-primary`, `text-primary-foreground`, `font-body`) tied to `src/app/theme.css` so that the theme palette and body/logo typography can be changed dynamically by the super_admin from the System Design configuration panel.
- **Aesthetic Quality:** Maintain high-quality visual standards across all versions of the components.

## 3. Technical Stack & Tools
- **Framework:** Next.js.
- **Styling:** Tailwind CSS.
- **UI Components:** shadcn/ui.
- **Toasts:** Use **shadcn/ui Sonner** (sonner) for toast notifications.
- **Alerts:** Use **SweetAlert2** for all administrative confirmations and success/error notifications. Avoid native browser `alert()` or `confirm()`.
- **Icons:** Use `lucide-react`.
- **Database:** MongoDB.

## 4. System Design Page Constraints
- **Preserve Functionality:** All existing functionalities of the System Design page (`/admin/system-design`) must remain completely unchanged and preserved in future updates.
- **Auto Super Admin Rule:** The email address `imranshuvo101@gmail.com` must be automatically registered/configured as `super_admin` in the system, and this rule/configuration must never be modified or removed.
- **Admin Assignment Workflow:** Both `admin` and `super_admin` are permitted to assign the `admin` role to users using only their email address from the user management page.
- **Project Expiration Setting:** The `super_admin` must be able to set the project's expiration date from the System Design page (`/admin/system-design`), and this functionality must remain fully functional.
<!-- END:nextjs-agent-rules -->

---

# Swapnobaz Agent Guidelines & Standard Operating Procedures (SOP)

## 1. Multi-Tenant / Dropshipping Scope Isolation
- Every database query in storefront contexts MUST include a logical partition key filtering by the appropriate `resellerId` / `tenantId`.
- Never mix data access between different resellers. Verify this in middleware/routing rewrite rules.

## 2. Product Synchronization & Webhook Guidelines
- Product updates from the Mother Catalog must be queued using Redis + BullMQ.
- Ensure proper logging of synchronization status and retry mechanism in background workers to maintain sync integrity.

## 3. Financial Transaction Safety
- Wallet balances (`wallets` collection) must be updated using atomicity operators in MongoDB (e.g., `$inc`) to prevent race conditions during payout or order processing.
- Write a corresponding entry in the `transactions` ledger for every financial change.

## 4. Third-Party Integrations
- All API keys, integration credentials (bKash, Nagad, Stripe, Courier APIs) must be fetched dynamically based on the reseller/tenant context rather than utilizing static environment variables, unless configuring the Mother system.
