import { useEffect, useLayoutEffect, useState } from 'react'
import './App.css'
import { GraphQLSubscription, generateClient } from 'aws-amplify/data'
import type { Schema } from '../amplify/data/resource'
import { throttle } from 'throttle-debounce'
import { uniqueNamesGenerator, animals, adjectives } from 'unique-names-generator'

const client = generateClient<Schema>()

const colors: Record<string, string> = {}

const defaultRoom = {
  id: "default",
  name: "default"
} as Schema["Room"]

function App() {
  const [cursors, setCursors] = useState<Record<string, { x: number, y: number }>>({})
  const [myPosition, setMyPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 })
  const [username, setUsername] = useState<string>(uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: '-',
    length: 2
  }))


  const [currentRoomId, setCurrentRoomId] = useState<string>("default")
  const [rooms, setRooms] = useState<Schema["Room"][]>([defaultRoom])

  useEffect(() => {
    const sub = client.graphql<GraphQLSubscription<{ subscribeCursor: { username: string, x: number, y: number } }>>({
      query: /* GraphQL */ `subscription MySubscription {
        subscribeCursor(roomId: "${currentRoomId}") {
          roomId
          username
          y
          x
        }
      }`
    }).subscribe({
      next: (event) => {
        if (event.data.subscribeCursor.username === username) {
          return
        }

        if (!colors[event.data.subscribeCursor.username]) {
          colors[event.data.subscribeCursor.username] = `hsl(${Math.random() * 360}, 100%, 50%)`
        }

        setCursors(oldCursors => {
          return { ...oldCursors, [event.data.subscribeCursor.username]: event.data.subscribeCursor }
        })
      }
    })

    return () => sub.unsubscribe()
  }, [username, currentRoomId])

  useEffect(() => { setCursors({}) }, [currentRoomId])

  useEffect(() => {
    const sub = client.models.Room.observeQuery().subscribe({
      next: (data) => {
        setRooms([defaultRoom, ...data.items])
      }
    })
    return () => sub.unsubscribe()
  }, [])

  useLayoutEffect(() => {
    const debouncedPublish = throttle(150, (username: string, x: number, y: number) => {
      client.mutations.publishCursor({ roomId: currentRoomId, username, x, y })
    }, {
      noLeading: true
    })

    function handleMouseMove(e: MouseEvent) {
      const x = Math.round(window.innerWidth / 2 - e.clientX)
      const y = Math.round(window.innerHeight / 2 - e.clientY)
      setMyPosition({ x, y })
      debouncedPublish(username, x, y)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [username, currentRoomId])

  return (
    <>
      <div className='cursor-panel'>
        <div className='info-panel'>
          <span>
            Move cursor around to broadcast cursor position to others in the room.
            <br/>
            Built with <a href="https://docs.amplify.aws/gen2">AWS Amplify Gen 2</a>.
          </span>
        </div>
        {Object.keys(cursors)
          .map(username =>
            <Cursor
              username={username}
              x={cursors[username].x}
              y={cursors[username].y}
              key={username} />)}
        <Cursor
          username={username}
          x={myPosition.x}
          y={myPosition.y}
          myself
          key={username} />
      </div>
      <div className='username-container'>
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
              setUsername(window.prompt("New username") ?? username)
            }}>{username}</button>
        </div>
      </div>
    </>
  )
}

function RoomSelector({
  rooms,
  currentRoomId,
  onRoomChange
}: {
  rooms: Schema["Room"][],
  currentRoomId: string,
  onRoomChange: (roomId: string) => void
}) {
  return <>
    <select
      onChange={e => onRoomChange(e.target.value)}
      value={currentRoomId}>
      {rooms.map(room => <option value={room.id} key={room.id}>{room.name}</option>)}
    </select>
    <button onClick={async () => {
      const newRoomName = window.prompt("Room name")
      if (!newRoomName) {
        return
      }
      const { data: room } = await client.models.Room.create({
        name: newRoomName
      })
      onRoomChange(room.id)
    }}>[+ add]</button>
  </>
}

function Cursor({ username, x, y, myself }: { username: string, x: number, y: number, myself?: boolean }) {
  return <div className='cursor' style={{
    background: myself ? 'white' : colors[username],
    left: window.innerWidth / 2 - x,
    top: window.innerHeight / 2 - y,
    transition: myself ? '' : 'all .35s ease-out',
  }}>{username}</div>
}

export default App
