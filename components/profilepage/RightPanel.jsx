// components/profilepage/RightPanel.jsx
import SectionTitle from "../styling/SectionTitle";
import EditableBio from "../editablecontent/EditableBio";
import EditableDJEquipment from "../editablecontent/EditableDJEquipment";
import EditableSpecializations from "../editablecontent/EditableSpecializations";
import EditableGenres from "../editablecontent/EditableGenres";
import CollaborationsWithReviews from "./CollaborationsWithReviews";
import ArtistDemos from "./ArtistDemos";
import LocationAddressSimple from "./LocationAddressSimple";
import MediaGallery from "./MediaGallery";
import { useTranslation } from "react-i18next";

export default function RightPanel({
  isOwnProfile,
  isArtist,
  isLocation,
  authUser,
  profileUid,
  userData,
  applyUpdate,
  addDemos,
  deleteDemo,
  onGalleryChange,
}) {
  const { t } = useTranslation();

  const goToGenre = (term) =>
    (window.location.href = `/search?q=${encodeURIComponent(term)}&type=genre`);
  const goToPref = (term) =>
    (window.location.href = `/search?q=${encodeURIComponent(term)}&type=pref`);

  // small helper for consistent dark cards
  const Card = ({ children }) => (
    <section className="rounded-2xl !bg-black !border !border-white/10">
      {children}
    </section>
  );

  return (
    <div className="w-full lg:w-2/3 space-y-8 text-white">
      {/* ABOUT */}
      <SectionTitle>{t("profile.about")}</SectionTitle>
      {(isOwnProfile || (userData.bio && userData.bio.trim().length > 0)) && (
        <Card>
          <EditableBio
            value={userData.bio || ""}
            canEdit={isOwnProfile}
            onSave={(val) => applyUpdate({ field: "bio", value: val })}
            maxLength={1000}
          />
        </Card>
      )}

      {/* ===== ARTIST LAYOUT ===== */}
      {isArtist && (
        <>
          {/* Genres first (what you play) */}
          <SectionTitle>{t("editable_genres.label")}</SectionTitle>
          <Card>
            <EditableGenres
              value={Array.isArray(userData.genres) ? userData.genres : []}
              canEdit={isOwnProfile}
              onSave={(genres) => applyUpdate({ field: "genres", value: genres })}
              onChipClick={goToGenre}
            />
          </Card>

          {/* Specializations / preferences */}
          <SectionTitle>{t("editable_specializations.label")}</SectionTitle>
          <Card>
            <EditableSpecializations
              value={Array.isArray(userData.specializations) ? userData.specializations : []}
              canEdit={isOwnProfile}
              onSave={(arr) => applyUpdate({ field: "specializations", value: arr })}
              onChipClick={goToPref}
            />
          </Card>

          {/* Equipment */}
          {(isOwnProfile || (userData.djEquipment && userData.djEquipment.length > 0)) && (
            <>
              <SectionTitle>{t("editable_dj_equipment.title")}</SectionTitle>
              <Card>
                <EditableDJEquipment
                  type="artist"
                  value={userData.djEquipment}
                  canEdit={isOwnProfile}
                  onSave={(payload) => applyUpdate({ field: "djEquipment", value: payload })}
                />
              </Card>
            </>
          )}

          {/* Demos */}
          <SectionTitle>{t("profile.demos")}</SectionTitle>
          <Card>
            <ArtistDemos
              canEdit={isOwnProfile}
              current={
                Array.isArray(userData.demos)
                  ? userData.demos.map((x) => (typeof x === "string" ? { url: x } : x))
                  : []
              }
              onAdded={addDemos}
              onDeleted={deleteDemo}
            />
          </Card>

          {/* Collabs & reviews */}
          <SectionTitle>{t("profile.collaborations")}</SectionTitle>
          <Card>
            <CollaborationsWithReviews
              profileUid={profileUid}
              side="artist"
              authUser={authUser}
              pageSize={20}
            />
          </Card>
        </>
      )}

      {/* ===== LOCATION LAYOUT ===== */}
      {isLocation && (
        <>
          {/* Address at the top for locations */}
          <SectionTitle>{t("profile.address")}</SectionTitle>
          <Card>
            <LocationAddressSimple
              address={userData.address}
              googleMapsLink={userData.googleMapsLink}
              canEdit={isOwnProfile}
              onChange={({ address, googleMapsLink }) => {
                applyUpdate({ field: "address", value: address });
                applyUpdate({ field: "googleMapsLink", value: googleMapsLink });
              }}
            />
          </Card>

          {/* Equipment */}
          {(isOwnProfile || (userData.djEquipment && userData.djEquipment.length > 0)) && (
            <>
              <SectionTitle>{t("profile.equipment")}</SectionTitle>
              <Card>
                <EditableDJEquipment
                  type="location"
                  value={userData.djEquipment}
                  canEdit={isOwnProfile}
                  onSave={(payload) => applyUpdate({ field: "djEquipment", value: payload })}
                />
              </Card>
            </>
          )}

          {/* Collabs & reviews */}
          <SectionTitle>{t("profile.collaborations")}</SectionTitle>
          <Card>
            <CollaborationsWithReviews
              profileUid={profileUid}
              side="location"
              authUser={authUser}
              pageSize={20}
            />
          </Card>
        </>
      )}

      {/* Media Gallery */}
      <SectionTitle>{t("profile.media_gallery")}</SectionTitle>
      <Card>
        <MediaGallery
          canEdit={isOwnProfile}
          authUser={authUser}
          items={userData.gallery}
          title={t("profile.media_gallery")}
          max={5}
          addButtonMode="hide"
          onChange={onGalleryChange}
          onExceedMax={(m) => console.log(`Limita de ${m} imagini atinsă`)}
          maxFileSizeMB={8}
          minWidth={600}
          minHeight={600}
          maxWidth={5000}
          maxHeight={5000}
        />
      </Card>
    </div>
  );
}
