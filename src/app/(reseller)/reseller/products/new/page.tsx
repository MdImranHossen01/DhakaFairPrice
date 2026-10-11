import { ProductForm } from '@/components/admin/ProductForm';

export default function NewProductPage() {
  return (
    <div className="flex-1 space-y-4">
      <ProductForm isReseller={true} />
    </div>
  );
}
