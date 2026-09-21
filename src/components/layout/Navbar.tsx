
import { NavbarSelector } from '@/components/templates/Registry';

export default function Navbar({ style = 'v1', initialCategories = [], initialBrands = [] }: { style?: string; initialCategories?: any[]; initialBrands?: any[] }) {
  return <NavbarSelector style={style} initialCategories={initialCategories} initialBrands={initialBrands} />;
}

