"use client";
import FloatingLines from "@/components/FloatingLines";
import ProfileUserPage from "@/pages/ProfileUserPage";

const ProfilePage = () => {
  return (
    <div className="relative min-h-screen -mt-10">
      {/* Background FloatingLines - nằm phía sau */}
      <div className="absolute inset-0 z-0">
        <FloatingLines
          enabledWaves={["top", "middle", "bottom"]}
          lineCount={5}
          lineDistance={5}
          bendRadius={5}
          bendStrength={-0.5}
          interactive={true}
          parallax={true}
        />
      </div>

      {/* Content - nằm phía trước */}
      <div className="relative z-10">
        <ProfileUserPage />
      </div>
    </div>
  );
};
export default ProfilePage;
