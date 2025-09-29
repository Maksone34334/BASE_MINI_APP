import { minikitConfig } from '../../../minikit.config';

export async function GET() {
  return Response.json({
    accountAssociation: minikitConfig.accountAssociation,
    baseBuilder: minikitConfig.baseBuilder,
    frame: {
      version: minikitConfig.miniapp.version,
      name: minikitConfig.miniapp.name,
      homeUrl: minikitConfig.miniapp.homeUrl,
      iconUrl: minikitConfig.miniapp.icon,
      splashImageUrl: minikitConfig.miniapp.screenshot,
      webhookUrl: minikitConfig.miniapp.webhookUrl
    }
  });
}