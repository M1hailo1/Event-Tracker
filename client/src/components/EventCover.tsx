import { eventCoverUrl, getEventCover } from "../data/eventCovers";

export default function EventCover({ coverId, className = "", eager = false }: {
  coverId?: string | null;
  className?: string;
  eager?: boolean;
}) {
  const cover = getEventCover(coverId);
  if (!cover) return null;
  return <img src={eventCoverUrl(cover.id)} alt="" width={960} height={480}
    loading={eager ? "eager" : "lazy"} decoding="async"
    className={`w-full aspect-[2/1] object-cover ${className}`} />;
}
