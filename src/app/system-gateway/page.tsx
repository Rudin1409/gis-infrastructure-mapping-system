import SystemGatewayClient from './SystemGatewayClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return <SystemGatewayClient />;
}
