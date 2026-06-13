e["agent_response"] = _llm_generate(prompt, routing.normalized_text)
            print(f"[Agent] {routing.intent_type} generated OK for {hotel_display_name}")
        except Exception as e:
            print(f"[Agent] {routing.intent_type} LLM failed for {hotel_display_name}: {e}")
            # Provide a context-aware fallback instead of generic message
            if routing.intent_type == "REVIEW_SUMMARY":
                fallback_parts = [f"**{hotel_display_name}**"]
                if hotel_full_data:
                    rating = hotel_full_data.get('rating', 0)
                    desc = hotel_full_data.get('description', '')
                    amenities = hotel_full_data.get('amenities', [])
                    suitable = hotel_full_data.get('suitable_for', [])
                    if rating:
                        fallback_parts.append(f"⭐ Đánh giá: {rating}/5")
                    if desc and desc != "Chưa có mô tả.":
                        fallback_parts.append(f"📝 {desc[:200]}")
                    if amenities:
                        fallback_parts.append(f"🏷️ Tiện ích: {', '.join(amenities[:5])}")
                    if suitable:
                        fallback_parts.append(f"👥 Phù hợp: {', '.join(suitable)}")
                else:
                    fallback_parts.append("⭐ Thông tin chi tiết đang được cập nhật.")
                response["agent_response"] = "\n".join(fallback_parts)
            elif routing.intent_type == "PRICE_EXPLANATION":
                if hotel_full_data:
                    price = hotel_full_data.get('price', 0)
                    rating = hotel_full_data.get('rating', 0)
                    response["agent_response"] = f"**{hotel_display_name}** có giá {int(price):,} VND/đêm với rating {rating}/5."
                else:
                    response["agent_response"] = f"**{hotel_display_name}** đang được cập nhật giá."
            elif routing.intent_type == "LOCAL_GUIDE":
                response["agent_response"] = f"📍 Xung quanh **{hotel_display_name}** có nhiều địa điểm tham quan thú vị như chợ, quán ăn, bãi biển. Bạn muốn tìm loại địa điểm nào?"
            elif routing.intent_type == "ITINERARY":
                response["agent_response"] = f"📅 Bạn muốn lên lịch trình tại khu vực **{context_location or 'này'}** trong bao nhiêu ngày?"
            else:
                response["agent_response"] = f"Mình có thể giúp bạn tìm hiểu thêm về **{hotel_display_name}**. Bạn cần gì?"

    elif routing.intent_type in ("FAQ", "MANAGE_BOOKING"):
        # Handle FAQ and other remaining intents with hotel context
        extra_ctx = ""
        if hotel_full_data:
            price_fmt = f"{int(hotel_full_data['price']):,} VND" if hotel_full_data.get('price') else "N/A"
            rating_str = f"{hotel_full_data['rating']}/5" if hotel_full_data.get('rating') else "Chưa có"
            extra_ctx_parts = [
                f"[THONG TIN KHACH SAN (Hợp lệ)]",
                f"Ten: {hotel_full_data['title']}",
                f"Dia chi: {hotel_full_data['address']}",
                f"Gia: {price_fmt}/dem",
                f"Danh gia: {rating_str}",
            ]
            extra_ctx = "\n".join(extra_ctx_parts)
        elif context_hotel_name:
            extra_ctx = f"[KHACH SAN HIEN TAI (Hợp lệ để trả lời)]\nTen: {context_hotel_name}\nDia chi: {context_address or 'Khong ro'}\nLuu y: KHACH SAN NAY HOP LE DE TRA LOI CAU HOI CUA NGUOI DUNG."
        prompt = compose_prompt(routing.intent_type, history_text, today, faq_context=faq_context, extra_context=extra_ctx)
        try: response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
        except: response["agent_response"] = "Mình có thể giúp bạn tìm phòng. Bạn cần gì?"

    elif routing.intent_type == "GENERAL":
        last_hotels = get_last_hotels(user_id)
        last_hotels_ctx = ""
        if last_hotels:
            lines = ["[DANH SACH KHACH SAN DA TIM THAY TRUOC DO]"]
            for i, h in enumerate(last_hotels, 1):
                price_fmt = f"{int(h['price']):,} VND" if h.get('price') else "N/A"
                lines.append(f"{i}. {h['title']} - {price_fmt}/dem - {h.get('address', '')}")
            last_hotels_ctx = "\n".join(lines)
        # Include current hotel context + full data if available
        ctx_parts = []
        if hotel_full_data:
            price_fmt = f"{int(hotel_full_data['price']):,} VND" if hotel_full_data.get('price') else "N/A"
            rating_str = f"{hotel_full_data['rating']}/5" if hotel_full_data.get('rating') else "Chưa có"
            ctx_parts.append(
                f"[KHACH SAN HIEN TAI (Hợp lệ để trả lời)]\n"
                f"Ten: {hotel_full_data['title']}\n"
                f"Dia chi: {hotel_full_data['address']}\n"
                f"Gia: {price_fmt}/dem\n"
                f"Danh gia: {rating_str}\n"
                f"Mo ta: {hotel_full_data['description']}\n"
                f"Tien ich: {', '.join(hotel_full_data.get('amenities', []))}\n"
                f"Luu y: KHACH SAN NAY HOP LE DE TRA LOI CAU HOI CUA NGUOI DUNG."
            )
        elif context_hotel_name:
            ctx_parts.append(f"[KHACH SAN HIEN TAI (Hợp lệ để trả lời)]\nTen: {context_hotel_name}\nDia chi: {context_address or 'Khong ro'}\nLuu y: KHACH SAN NAY HOP LE DE TRA LOI CAU HOI CUA NGUOI DUNG.")
        if last_hotels_ctx:
            ctx_parts.append(last_hotels_ctx)
        combined_ctx = "\n\n".join(ctx_parts)
        prompt = compose_prompt("GENERAL", history_text, today, extra_context=combined_ctx)
        try: response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
        except: response["agent_response"] = "Mình có thể giúp bạn tìm phòng. Bạn cần gì?"

    save_message_to_context(user_id, "user", user_text)
    save_message_to_context(user_id, "assistant", response["agent_response"])
    return response