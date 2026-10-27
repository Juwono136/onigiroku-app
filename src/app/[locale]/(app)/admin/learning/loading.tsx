import { AdminCategoryBoardSkeleton } from "@/components/admin/admin-loading";

export default function AdminLearningLoading() {
  return (
    <div className="mx-auto w-full max-w-[96rem] px-3 py-4 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
      <AdminCategoryBoardSkeleton />
    </div>
  );
}
