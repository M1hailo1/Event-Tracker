import { Link } from "react-router-dom";
import { usePagedList, ListMore } from "./usePagedList";

type Attendee = { id: string; user: { id: string; name: string } };

export default function EventAttendees({ eventId }: { eventId: string }) {
  const list = usePagedList<Attendee>(`/events/${eventId}/attendees`);
  return (
    <section className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">
      <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">List of Attendees</h3>
      <ul className="flex flex-wrap gap-2">
        {list.items.map(item => (
          <li key={item.id}>
            <Link to={`/users/${item.user.id}`}
              className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
              {item.user.name}
            </Link>
          </li>
        ))}
      </ul>
      <ListMore {...list} onMore={list.loadMore} />
    </section>
  );
}
