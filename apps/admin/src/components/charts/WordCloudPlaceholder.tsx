// Ghi chú: Để sử dụng thực tế, bạn cần cài đặt thư viện như `react-wordcloud`
// pnpm add react-wordcloud

const WordCloudPlaceholder = () => (
    <div className="flex h-full flex-col items-center justify-center p-4">
        <div className="mb-2 text-4xl text-yellow-500">☁️</div>
        <p className="text-md text-foreground font-semibold">Word Cloud Analysis</p>
        <p className="text-muted-foreground mt-1 text-center text-xs">
            (Cần thư viện bên ngoài: Từ khóa phổ biến như "Clean", "Friendly", "Great location".)
        </p>
    </div>
);

export default WordCloudPlaceholder;
