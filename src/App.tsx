import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import './App.css'
import { GraphQLSubscription, generateClient } from 'aws-amplify/data'
import type { Schema } from '../amplify/data/resource'
import { throttle } from 'throttle-debounce'
import { uniqueNamesGenerator, animals, adjectives } from 'unique-names-generator'

const client = generateClient<Schema>()

function App() {
  const usernameRef = useRef<HTMLInputElement>(null)
  const [cursors, setCursors] = useState<Record<string, { x: number, y: number }>>({})

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
        console.log(event)
        if (event.data.subscribeCursor.username === usernameRef.current?.value) {
          return
        }
        const newCursors = { ...cursors, [event.data.subscribeCursor.username]: event.data.subscribeCursor }
        setCursors(newCursors)
      }
    })

    return () => sub.unsubscribe()
  }, [])

  useLayoutEffect(() => {
    const debouncedPublish = throttle(150, (username: string, x: number, y: number) => {
      client.mutations.publishCursor({ username, x, y })
    }, {
      noLeading: true
    })

    window.addEventListener('mousemove', (e) => {
      const username = usernameRef.current?.value ?? 'unknown'

      const x = Math.round(window.innerWidth / 2 - e.clientX)
      const y = Math.round(window.innerHeight / 2 - e.clientY)
      debouncedPublish(username, x, y)
    })
  }, [])

  return (
    <>
      <div style={{
        background: 'gray',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0
      }}>
        {Object.keys(cursors).map(username => <div style={{
          background: 'green',
          position: 'absolute',
          display: 'inline',
          transition: 'all 0.35s ease',
          left: window.innerWidth / 2 - cursors[username].x,
          top: window.innerHeight / 2 - cursors[username].y,
          borderRadius: '0 10px 10px 10px',
          padding: '4px 8px',
        }}>{username}</div>)}
      </div>
      <input style={{ position: 'fixed', zIndex: 20, background: 'white'}} defaultValue={uniqueNamesGenerator({
        dictionaries: [adjectives, animals],
        length: 2,
        separator: '-'
      })} placeholder='Enter username' ref={usernameRef} />
    </>
  )
}

export default App
