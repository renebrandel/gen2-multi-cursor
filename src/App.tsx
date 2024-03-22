import { useEffect, useLayoutEffect, useState } from 'react'
import './App.css'
import { GraphQLSubscription, generateClient } from 'aws-amplify/data'
import type { Schema } from '../amplify/data/resource'
import { throttle } from 'throttle-debounce'
import { uniqueNamesGenerator, animals, adjectives } from 'unique-names-generator'

const client = generateClient<Schema>()

const colors: Record<string, string> = {}

function App() {
  const [cursors, setCursors] = useState<Record<string, { x: number, y: number }>>({})
  const [myPosition, setMyPosition] = useState<{x: number, y: number}>({x: 0, y: 0})
  const [username, setUsername] = useState<string>(uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: '-',
    length: 2
  }))

  useEffect(() => {
    const sub = client.graphql<GraphQLSubscription<{ subscribeCursor: { username: string, x: number, y: number } }>>({
      query: /* GraphQL */ `subscription MySubscription {
        subscribeCursor {
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
  }, [username])

  useLayoutEffect(() => {
    const debouncedPublish = throttle(150, (username: string, x: number, y: number) => {
      client.mutations.publishCursor({ username, x, y })
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
  }, [username])

  return (
    <>
      <div className='cursor-panel'>
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
        <div className="username-panel">
          Username
          <button
            onClick={() => {
              setUsername(window.prompt("New username") ?? username)
            }}>{username}</button>
        </div>
      </div>
    </>
  )
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
