/**
 * 1-Click Vercel + Cloudflare Subdomain / Domain Provisioning Utility
 *
 * Automatically:
 * 1. Adds the reseller subdomain (`shop.rootdomain.com`) to the Vercel project
 * 2. Adds `_vercel` TXT ownership verification record in Cloudflare DNS (if requested by Vercel)
 * 3. Creates/updates the `CNAME` record in Cloudflare DNS (`proxied: false` initially for instant verification)
 * 4. Calls Vercel's Verify Domain API
 * 5. Enables Cloudflare Proxy (`proxied: true` / Orange Cloud) so Cloudflare Edge Caching works
 */

export interface DomainProvisionResult {
  success: boolean;
  domain: string;
  vercelAdded: boolean;
  vercelVerified: boolean;
  cloudflareDnsConfigured: boolean;
  cloudflareProxied: boolean;
  message: string;
  errors: string[];
}

async function resolveVercelTeamQuery(vercelToken: string, projectId: string, explicitTeamId?: string): Promise<string> {
  if (explicitTeamId) {
    return `?teamId=${encodeURIComponent(explicitTeamId)}`;
  }

  try {
    const probe = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}`, {
      headers: { Authorization: `Bearer ${vercelToken}` },
    });
    if (probe.ok) return '';

    const teamsRes = await fetch('https://api.vercel.com/v2/teams', {
      headers: { Authorization: `Bearer ${vercelToken}` },
    });
    if (teamsRes.ok) {
      const teamsData = (await teamsRes.json()) as any;
      const firstTeamId = teamsData?.teams?.[0]?.id;
      if (firstTeamId) {
        return `?teamId=${encodeURIComponent(firstTeamId)}`;
      }
    }
  } catch {}

  return '';
}

export async function provisionResellerDomain(params: {
  subdomain: string;
  customDomain?: string;
}): Promise<DomainProvisionResult> {
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dhakafairprice.com').trim().toLowerCase();
  const cleanSub = params.subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  const fullSubdomain = `${cleanSub}.${rootDomain}`;

  const result: DomainProvisionResult = {
    success: false,
    domain: fullSubdomain,
    vercelAdded: false,
    vercelVerified: false,
    cloudflareDnsConfigured: false,
    cloudflareProxied: false,
    message: '',
    errors: [],
  };

  const cfZoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
  const cfToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const vercelToken = process.env.VERCEL_TOKEN?.trim();
  const vercelProjectId = process.env.VERCEL_PROJECT_ID?.trim();
  const vercelTeamId = process.env.VERCEL_TEAM_ID?.trim();
  const cnameTarget = (process.env.VERCEL_CNAME_TARGET || 'ea172862f2983d73.vercel-dns-017.com')
    .trim()
    .replace(/\.$/, '');

  if (!cfZoneId || !cfToken) {
    result.errors.push('Missing CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN in environment variables.');
  }
  if (!vercelToken || !vercelProjectId) {
    result.errors.push('Missing VERCEL_TOKEN or VERCEL_PROJECT_ID in environment variables.');
  }
  if (result.errors.length > 0) {
    result.message = result.errors.join(' ');
    return result;
  }

  try {
    const teamQuery = await resolveVercelTeamQuery(vercelToken!, vercelProjectId!, vercelTeamId);

    // ── 1. Add Subdomain to Vercel Project ──────────────────────────────────
    let vercelDomainData: any = null;
    const addVercelRes = await fetch(
      `https://api.vercel.com/v10/projects/${encodeURIComponent(vercelProjectId!)}/domains${teamQuery}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: fullSubdomain }),
      }
    );

    vercelDomainData = await addVercelRes.json().catch(() => ({}));

    if (addVercelRes.ok || addVercelRes.status === 409) {
      result.vercelAdded = true;
      if (addVercelRes.status === 409) {
        const getDomRes = await fetch(
          `https://api.vercel.com/v9/projects/${encodeURIComponent(vercelProjectId!)}/domains/${encodeURIComponent(fullSubdomain)}${teamQuery}`,
          {
            headers: { Authorization: `Bearer ${vercelToken}` },
          }
        );
        if (getDomRes.ok) {
          vercelDomainData = await getDomRes.json().catch(() => vercelDomainData);
        }
      }
    } else {
      result.errors.push(
        `Vercel add domain failed: ${vercelDomainData?.error?.message || addVercelRes.statusText}`
      );
    }

    const cleanCustom = params.customDomain
      ? params.customDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '')
      : '';
    if (cleanCustom) {
      await fetch(
        `https://api.vercel.com/v10/projects/${encodeURIComponent(vercelProjectId!)}/domains${teamQuery}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: cleanCustom }),
        }
      ).catch(() => {});
    }

    // ── 2. Add _vercel TXT Verification Record in Cloudflare (if required) ──
    const verifications: any[] = Array.isArray(vercelDomainData?.verification)
      ? vercelDomainData.verification
      : [];

    for (const v of verifications) {
      if (v?.type === 'TXT' && v?.value) {
        const txtName = `_vercel.${rootDomain}`;
        const listTxtRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records?type=TXT&name=${encodeURIComponent(txtName)}`,
          {
            headers: { Authorization: `Bearer ${cfToken}` },
          }
        );
        const listTxtData = (await listTxtRes.json().catch(() => null)) as any;
        const alreadyHasTxt = listTxtData?.result?.some((r: any) => r.content === v.value);

        if (!alreadyHasTxt) {
          await fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${cfToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'TXT',
              name: '_vercel',
              content: v.value,
              ttl: 1,
            }),
          }).catch(() => {});
        }
      }
    }

    // ── 3. Create or Update CNAME in Cloudflare (proxied: false first) ──────
    let dnsRecordId: string | null = null;
    const listDnsRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records?name=${encodeURIComponent(fullSubdomain)}`,
      {
        headers: { Authorization: `Bearer ${cfToken}` },
      }
    );
    const listDnsData = (await listDnsRes.json().catch(() => null)) as any;

    if (!listDnsRes.ok || !listDnsData?.success) {
      result.errors.push(
        `Cloudflare DNS lookup failed (check token DNS:Edit permission): ${
          listDnsData?.errors?.[0]?.message || listDnsRes.statusText
        }`
      );
    } else {
      const existingRecord = listDnsData?.result?.[0];
      if (existingRecord?.id) {
        dnsRecordId = existingRecord.id;
        const updateRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records/${dnsRecordId}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${cfToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'CNAME',
              name: cleanSub,
              content: cnameTarget,
              proxied: false,
              ttl: 1,
            }),
          }
        );
        const updateData = (await updateRes.json().catch(() => null)) as any;
        if (updateRes.ok && updateData?.success) {
          result.cloudflareDnsConfigured = true;
        } else {
          result.errors.push(
            `Cloudflare DNS update failed: ${updateData?.errors?.[0]?.message || updateRes.statusText}`
          );
        }
      } else {
        const createRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${cfToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'CNAME',
              name: cleanSub,
              content: cnameTarget,
              proxied: false,
              ttl: 1,
            }),
          }
        );
        const createData = (await createRes.json().catch(() => null)) as any;
        if (createRes.ok && createData?.success) {
          dnsRecordId = createData?.result?.id || null;
          result.cloudflareDnsConfigured = true;
        } else {
          result.errors.push(
            `Cloudflare DNS create failed: ${createData?.errors?.[0]?.message || createRes.statusText}`
          );
        }
      }
    }

    // ── 4. Verify Domain in Vercel ──────────────────────────────────────────
    if (result.vercelAdded && result.cloudflareDnsConfigured) {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const verifyRes = await fetch(
        `https://api.vercel.com/v9/projects/${encodeURIComponent(vercelProjectId!)}/domains/${encodeURIComponent(fullSubdomain)}/verify${teamQuery}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${vercelToken}` },
        }
      );
      const verifyData = (await verifyRes.json().catch(() => null)) as any;
      if (verifyRes.ok && verifyData?.verified !== false) {
        result.vercelVerified = true;
      } else if (vercelDomainData?.verified === true) {
        result.vercelVerified = true;
      }
    }

    // ── 5. Turn ON Cloudflare Orange Cloud (proxied: true) ──────────────────
    if (dnsRecordId && result.cloudflareDnsConfigured) {
      const proxyRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records/${dnsRecordId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${cfToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'CNAME',
            name: cleanSub,
            content: cnameTarget,
            proxied: true,
            ttl: 1,
          }),
        }
      );
      const proxyData = (await proxyRes.json().catch(() => null)) as any;
      if (proxyRes.ok && proxyData?.success) {
        result.cloudflareProxied = true;
      }
    }

    result.success = result.vercelAdded && result.cloudflareDnsConfigured;
    result.message = result.success
      ? `${fullSubdomain} connected to Vercel & Cloudflare (${result.cloudflareProxied ? 'Proxied / Orange Cloud ON' : 'DNS Only'})`
      : result.errors.join(' | ');

    return result;
  } catch (err: any) {
    result.errors.push(err?.message || 'Unexpected error during domain provisioning');
    result.message = result.errors.join(' | ');
    return result;
  }
}
