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
      homeUrl: minikitConfig.miniapp.homeUrl,
      iconUrl: minikitConfig.miniapp.icon,
      splashImageUrl: minikitConfig.miniapp.screenshot,
      splashBackgroundColor: minikitConfig.miniapp.splashBackgroundColor,
      webhookUrl: minikitConfig.miniapp.webhookUrl,
      ogImageUrl: minikitConfig.miniapp.ogImageUrl,
      primaryCategory: minikitConfig.miniapp.primaryCategory
    }
  });
}