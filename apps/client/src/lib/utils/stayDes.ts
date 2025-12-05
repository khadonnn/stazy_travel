const descriptions = [
    'Ở đây du khách có thể tận hưởng khung cảnh hồ thơ mộng, thư giãn bên hồ bơi ngoài trời, thưởng thức đồ uống tại quầy bar hay trò chuyện trong không gian sinh hoạt chung. Khuôn viên thường có vườn xanh mát, khu vực tiệc nướng ngoài trời và WiFi miễn phí.',

    'Phòng nghỉ được trang bị đầy đủ tiện nghi với phòng tắm riêng, vòi rửa, máy sấy tóc và đồ dùng cá nhân. Một số nơi còn có sân hiên, mang đến không gian thoáng đãng để nghỉ ngơi, tận hưởng sự yên bình.',

    'Du khách có thể thuê xe đạp hoặc xe hơi để khám phá cảnh quan xung quanh. Những hoạt động ngoài trời như đạp xe, dạo chơi giữa thiên nhiên hứa hẹn mang lại trải nghiệm đáng nhớ.',
];
export function getRandomDescription() {
    const randomIndex = Math.floor(Math.random() * descriptions.length);
    return descriptions[randomIndex];
}
