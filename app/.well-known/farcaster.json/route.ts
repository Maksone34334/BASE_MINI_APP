import { minikitConfig } from '../../../minikit.config';

export async function GET() {
  return Response.json({
    accountAssociation: minikitConfig.accountAssociation,
    baseBuilder: minikitConfig.baseBuilder,
    frame: {
      version: minikitConfig.miniapp.version,
      name: minikitConfig.miniapp.name,
      subtitle: minikitConfig.miniapp.subtitle,
      description: minikitConfig.miniapp.description,
      tagline: minikitConfig.miniapp.tagline,
      homeUrl: minikitConfig.miniapp.homeUrl,
      iconUrl: minikitConfig.miniapp.iconUrl,
      splashImageUrl: minikitConfig.miniapp.splashImageUrl,
      splashBackgroundColor: minikitConfig.miniapp.splashBackgroundColor,
      webhookUrl: minikitConfig.miniapp.webhookUrl,
      heroImageUrl: minikitConfig.miniapp.heroImageUrl,
      ogTitle: minikitConfig.miniapp.ogTitle,
      ogDescription: minikitConfig.miniapp.ogDescription,
      ogImageUrl: minikitConfig.miniapp.ogImageUrl,
      primaryCategory: minikitConfig.miniapp.primaryCategory,
      tags: minikitConfig.miniapp.tags
    }
  });
}