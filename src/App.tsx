import { useEffect, useLayoutEffect, useState } from "react";
import "./App.css";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";
import { throttle } from "throttle-debounce";
import {
  uniqueNamesGenerator,
  animals,
  adjectives,
} from "unique-names-generator";
import { StorageManager, StorageImage } from "@aws-amplify/ui-react-storage";
import { list } from "aws-amplify/storage";

const client = generateClient<Schema>();

const colors: Record<string, string> = {};

const defaultRoom: Schema["Room"] = {
  id: "default",
  name: "default",
  createdAt: "",
  updatedAt: "",
};

function App() {
  const [cursors, setCursors] = useState<
    Record<string, { x: number; y: number }>
  >({});

  const getImages = async (currentRoomId: string) => {
    try {
      const images = await list({
        path: currentRoomId + "/",
      });
      console.log(images.items)
      
      setImages([...images.items])
    } catch (error) {
      console.log(error);
    }
  };

  const [myPosition, setMyPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [username, setUsername] = useState<string>(
    uniqueNamesGenerator({
      dictionaries: [adjectives, animals],
      separator: "-",
      length: 2,
    })
  );

  const [currentRoomId, setCurrentRoomId] = useState<string>("default");
  const [rooms, setRooms] = useState<Schema["Room"][]>([defaultRoom]);
  const [images, setImages] = useState<Array>([])

  useEffect(() => {
    // Add subscriptions here
    const sub = client.subscriptions
      .subscribeCursor({
        roomId: currentRoomId,
        myUsername: username,
      })
      .subscribe({
        next: (event) => {
          if (!event) {
            return;
          }

          if (!colors[event.username]) {
            colors[event.username] = `hsl(${Math.random() * 360}, 100%, 50%)`;
          }

          setCursors((cursors) => {
            return {
              ...cursors,
              [event.username]: event,
            };
          });
        },
      });

    return () => sub.unsubscribe();
  }, [username, currentRoomId]);

  useEffect(() => {
    setCursors({});
  }, [currentRoomId]);

  useEffect(() => {
    const sub = client.models.Room.observeQuery().subscribe({
      next: (data) => {
        setRooms([defaultRoom, ...data.items]);
      },
    });
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    getImages(currentRoomId);
  }, [currentRoomId]);

  useLayoutEffect(() => {
    const debouncedPublish = throttle(
      150,
      (username: string, x: number, y: number) => {
        client.mutations.publishCursor({
          roomId: currentRoomId,
          username,
          x,
          y,
        });
      },
      {
        noLeading: true,
      }
    );

    function handleMouseMove(e: MouseEvent) {
      const x = Math.round(window.innerWidth / 2 - e.clientX);
      const y = Math.round(window.innerHeight / 2 - e.clientY);
      setMyPosition({ x, y });
      debouncedPublish(username, x, y);
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [username, currentRoomId]);

  return (
    <>
      <div className="cursor-panel">
        <div className="info-panel">
          <span>
            Move cursor around to broadcast cursor position to others in the
            room.
            <br />
            Built with{" "}
            <a href="https://docs.amplify.aws/gen2">AWS Amplify Gen 2</a>.
          </span>
        </div>
        {Object.keys(cursors).map((username) => (
          <Cursor
            username={username}
            x={cursors[username].x}
            y={cursors[username].y}
            key={username}
          />
        ))}
        <Cursor
          username={username}
          x={myPosition.x}
          y={myPosition.y}
          myself
          key={username}
        />
      </div>
      <div className="username-container">
        <div className="control-panel">
          Room
          <RoomSelector
            currentRoomId={currentRoomId}
            rooms={rooms}
            onRoomChange={setCurrentRoomId}
          />
          | Username
          <button
            onClick={() => {
              setUsername(window.prompt("New username") ?? username);
            }}
          >
            {username}
          </button>
        </div>
        <div className="image-upload">
          <StorageManager
            onUploadSuccess={() => getImages(currentRoomId)}
            acceptedFileTypes={["image/*"]}
            accessLevel="guest"
            maxFileCount={1}
            isResumable
            path={currentRoomId + "/"}
          />
        </div>
        {images.map((image: object)=> <StorageImage alt="" imgKey={image.key} accessLevel="guest" width="200px" height="200px" />)}
      </div>
    </>
  );
}

function RoomSelector({
  rooms,
  currentRoomId,
  onRoomChange,
}: {
  rooms: Schema["Room"][];
  currentRoomId: string;
  onRoomChange: (roomId: string) => void;
}) {
  return (
    <>
      <select
        onChange={(e) => onRoomChange(e.target.value)}
        value={currentRoomId}
      >
        {rooms.map((room) => (
          <option value={room.id} key={room.id}>
            {room.name}
          </option>
        ))}
      </select>
      <button
        onClick={async () => {
          const newRoomName = window.prompt("Room name");
          if (!newRoomName) {
            return;
          }
          const { data: room } = await client.models.Room.create({
            name: newRoomName,
          });
          onRoomChange(room.id);
        }}
      >
        [+ add]
      </button>
    </>
  );
}

function Cursor({
  username,
  x,
  y,
  myself,
}: {
  username: string;
  x: number;
  y: number;
  myself?: boolean;
}) {
  return (
    <div
      className="cursor"
      style={{
        background: myself ? "white" : colors[username],
        left: window.innerWidth / 2 - x,
        top: window.innerHeight / 2 - y,
        transition: myself ? "" : "all .35s ease-out",
      }}
    >
      {username}
    </div>
  );
}

export default App;
