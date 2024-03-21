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
  const [username, setUsername] = useState<string>(uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: '-',
    length: 2
  }))

  console.log(cursors)
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
          return { ...oldCursors,  [event.data.subscribeCursor.username]: event.data.subscribeCursor }
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
      debouncedPublish(username, x, y)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [username])

  return (
    <>
      <div style={{
        background: 'linear-gradient(135deg, rgb(117, 81, 194), rgb(255, 255, 255))',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        userSelect: 'none',
        overflow: 'hidden'
      }}>
        {Object.keys(cursors).map(username => <div style={{
          background: colors[username],
          position: 'absolute',
          display: 'inline',
          transition: 'all 0.35s ease',
          left: window.innerWidth / 2 - cursors[username].x,
          top: window.innerHeight / 2 - cursors[username].y,
          borderRadius: '0 10px 10px 10px',
          padding: '4px 8px',
          wordWrap: 'unset',
          whiteSpace: 'nowrap'
        }}>{username}</div>)}
      </div>
      <div style={{
        top: 32,
        left: 0,
        right: 0,
        position: 'fixed',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex',
          padding: '16px',
          gap: '8px',
          overflow: 'auto',
          background: 'white',
          boxShadow: '0 16px 24px rgba(0,0,0,0.3)',
          borderRadius: '32px',
        }}>

          Username
          <button onClick={() => {
            setUsername(window.prompt("New username") ?? username)
          }} style={{ textDecoration: 'underline', fontWeight: 800, padding: 0, margin: 0 }}>{username}</button>
        </div>
      </div>
    </>
  )
}

export default App
