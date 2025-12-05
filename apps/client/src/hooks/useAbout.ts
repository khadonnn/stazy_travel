import { useAboutStore } from '@/store/aboutStore'; // Đảm bảo đường dẫn đúng

/**
 * Custom hook để truy cập trạng thái và hành động của About Store.
 * @returns {object} Trả về các phần tử cần thiết từ AboutStore.
 */
export const useAbout = () => {
    // Lấy toàn bộ state và action cần thiết
    const { 
        aboutData, 
        isLoading, 
        loadData, 
        // ... Thêm các actions khác nếu cần sử dụng ngoài trang About
        updateAboutData,
        addTeamMember,
        updateTeamMember,
        deleteTeamMember,
        resetToDefault,
        //...
    } = useAboutStore((state) => ({
        aboutData: state.aboutData,
        isLoading: state.isLoading,
        loadData: state.loadData,
        updateAboutData: state.updateAboutData,
        addTeamMember: state.addTeamMember,
        updateTeamMember: state.updateTeamMember,
        deleteTeamMember: state.deleteTeamMember,
        resetToDefault: state.resetToDefault,
        // Thêm các service actions nếu bạn cần chúng ở đây
    }));

    // Trả về dữ liệu và các hàm hành động
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