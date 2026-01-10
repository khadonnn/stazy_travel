import { useAboutStore } from "@/store/aboutStore";
// ✅ THÊM IMPORT NÀY
import { useShallow } from "zustand/react/shallow";

/**
 * Custom hook để truy cập trạng thái và hành động của About Store.
 * @returns {object} Trả về các phần tử cần thiết từ AboutStore.
 */
export const useAbout = () => {
  // ✅ BỌC SELECTOR TRONG useShallow
  const {
    aboutData,
    isLoading,
    loadData,
    updateAboutData,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    resetToDefault,
  } = useAboutStore(
    useShallow((state) => ({
      aboutData: state.aboutData,
      isLoading: state.isLoading,
      loadData: state.loadData,
      updateAboutData: state.updateAboutData,
      addTeamMember: state.addTeamMember,
      updateTeamMember: state.updateTeamMember,
      deleteTeamMember: state.deleteTeamMember,
      resetToDefault: state.resetToDefault,
    }))
  );

  return {
    aboutData,
    isLoading,
    loadData,
    updateAboutData,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    resetToDefault,
  };
};
