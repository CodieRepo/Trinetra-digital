import ClientApp from './ClientApp';

export function generateStaticParams() {
  return [
    { slug: [] },
    { slug: ['services'] },
    { slug: ['pricing'] },
    { slug: ['contact'] },
    { slug: ['about'] },
    { slug: ['gorakhpur'] },
    { slug: ['uttar-pradesh'] }
  ];
}

export default function CatchAllPage() {
  return <ClientApp />;
}
