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
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../src/firebase";

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
  const goToGenre = (term) => (window.location.href = `/search?q=${encodeURIComponent(term)}&type=genre`);
  const goToPref  = (term) => (window.location.href = `/search?q=${encodeURIComponent(term)}&type=pref`);

  return (
    <div className="w-full md:w-2/3 space-y-8">
      <SectionTitle>Despre</SectionTitle>
      {(isOwnProfile || (userData.bio && userData.bio.trim().length > 0)) && (
        <section>
          <EditableBio
            value={userData.bio || ""}
            canEdit={isOwnProfile}
            onSave={(val) => applyUpdate({ field: "bio", value: val })}
            maxLength={1000}
          />
        </section>
      )}

      {/* ARTIST */}
      {isArtist && (
        <>
          {(isOwnProfile || (userData.djEquipment && userData.djEquipment.length > 0)) && (
            <EditableDJEquipment
              type="artist"
              value={userData.djEquipment}
              canEdit={isOwnProfile}
              onSave={(payload) => applyUpdate({ field: "djEquipment", value: payload })}
            />
          )}

          <EditableSpecializations
            value={Array.isArray(userData.specializations) ? userData.specializations : []}
            canEdit={isOwnProfile}
            onSave={(arr) => applyUpdate({ field: "specializations", value: arr })}
            onChipClick={goToPref}
          />

          <EditableGenres
            value={Array.isArray(userData.genres) ? userData.genres : []}
            canEdit={isOwnProfile}
            onSave={(genres) => applyUpdate({ field: "genres", value: genres })}
            onChipClick={goToGenre}
          />

          <section>
            <SectionTitle>Colaborări</SectionTitle>
            <CollaborationsWithReviews
              profileUid={profileUid}
              side="artist"
              authUser={authUser}
              pageSize={20}
            />
          </section>

          <section>
            <SectionTitle>Demo-uri</SectionTitle>
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
          </section>
        </>
      )}

      {/* LOCAȚIE */}
      {isLocation && (
        <>
          {(isOwnProfile || (userData.djEquipment && userData.djEquipment.length > 0)) && (
            <EditableDJEquipment
              type="location"
              value={userData.djEquipment}
              canEdit={isOwnProfile}
              onSave={(payload) => applyUpdate({ field: "djEquipment", value: payload })}
            />
          )}

          <section>
            <SectionTitle>Adresă</SectionTitle>
            <LocationAddressSimple
              address={userData.address}
              mapsLink={userData.googleMapsLink}
              canEdit={isOwnProfile}
              onChange={({ address, googleMapsLink }) => {
                applyUpdate({ field: "address", value: address });
                applyUpdate({ field: "googleMapsLink", value: googleMapsLink });
              }}
            />
          </section>

          <section>
            <SectionTitle>Colaborări</SectionTitle>
            <CollaborationsWithReviews
              profileUid={profileUid}
              side="location"
              authUser={authUser}
              pageSize={20}
            />
          </section>
        </>
      )}

      {/* GALERIE */}
      <section>
        <SectionTitle>Galerie media</SectionTitle>
        <MediaGallery
          canEdit={isOwnProfile}
          authUser={authUser}
          items={userData.gallery}
          title="Galerie media"
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
      </section>
    </div>
  );
}
