import { useEffect, useRef, useState } from 'react'
import io, { Socket } from 'socket.io-client'
import { produce, enableMapSet } from 'immer'

enableMapSet()
function App() {
  /**
   * @type [Socket<DefaultEventsMap, DefaultEventsMap>, React.Dispatch<React.SetStateAction<Socket<DefaultEventsMap, DefaultEventsMap>>>]
   */
  const [mySocket, setMySocket] = useState(null)
  const [roomIdToMessageMapping, setRoomIdToMessageMapping] = useState({})
  const [activeRoomId, setActiveRoomId] = useState()
  const [message, setMessage] = useState('')

  const [username, setUsername] = useState('')
  const isPromptAlreadyShown = useRef(false)

  const [roomIdToTypingUsernameMapping, setRoomIdToTypingUsernameMapping] =
    useState({})

  const [
    roomIdUsernameToTypingTimerIndicatorMapping,
    setRoomIdUsernameToTypingTimerIndicatorMapping
  ] = useState({})

  useEffect(() => {
    if (isPromptAlreadyShown.current === false) {
      isPromptAlreadyShown.current = true
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const validUsername = window.prompt('Enter your username')
        if (validUsername?.trim()) {
          setUsername(validUsername)
          break
        }
      }
    }

    const socket = io('ws://localhost:3001')

    setMySocket(socket)

    socket.on('roomMessage', ({ roomId, message, username, messageId }) => {
      setRoomIdToMessageMapping(
        produce((state) => {
          state[roomId] = state[roomId] || []

          if (state[roomId].some((obj) => obj.messageId === messageId)) {
            // this message already exists in state and should not be added again
          } else {
            state[roomId].push({ roomId, message, username, messageId })
          }
        })
      )
    })

    socket.on('userTyping', ({ roomId, username }) => {
      setRoomIdToTypingUsernameMapping(
        produce((state) => {
          state[roomId] = state[roomId] || new Set()
          state[roomId].add(username)
        })
      )

      const timeoutId = setTimeout(() => {
        setRoomIdToTypingUsernameMapping(
          produce((state) => {
            state[roomId] = state[roomId] || new Set()
            state[roomId].delete(username)
          })
        )
      }, 5000)

      setRoomIdUsernameToTypingTimerIndicatorMapping(
        produce((state) => {
          clearTimeout(state[`${roomId}-${username}`])
          state[`${roomId}-${username}`] = timeoutId
        })
      )
    })

    return () => {
      socket.close()
    }
  }, [])

  function joinRoomExclusively(roomId) {
    if (mySocket === null) return null

    setActiveRoomId(roomId)
    mySocket.emit('join-room-exclusively', roomId)
  }

  function sendMessage() {
    if (mySocket === null) return null

    if (typeof activeRoomId !== 'number') {
      alert('Please select a room first before sending a message.')
      return
    }

    mySocket.emit('sendMessage', { roomId: activeRoomId, message, username })
  }

  function sendTypingIndicator() {
    if (mySocket === null) return null

    if (typeof activeRoomId !== 'number') {
      return
    }

    mySocket.emit('sendTypingIndicator', {
      roomId: activeRoomId,
      username
    })
  }

  if (mySocket === null) return null

  const messagesOfRoom = roomIdToMessageMapping[activeRoomId] || []
  const typingUsersInTheRoom =
    roomIdToTypingUsernameMapping[activeRoomId] != null
      ? [...roomIdToTypingUsernameMapping[activeRoomId]]
      : []

  return (
    <div className='grid grid-cols-12 divide-x divide-gray-300 h-screen'>
      <aside className='col-span-4 px-4 h-screen overflow-y-auto'>
        {Array(20)
          .fill(0)
          .map((_, i) => {
            return (
              <div
                key={i}
                onClick={() => {
                  joinRoomExclusively(i + 1)
                }}
                className={`p-2 cursor-pointer ${
                  activeRoomId === i + 1
                    ? 'bg-black text-white'
                    : 'hover:bg-gray-100'
                } `}
              >
                Room #{i + 1}{' '}
              </div>
            )
          })}
      </aside>

      <main className='col-span-8 px-8 h-screen overflow-y-auto flex flex-col'>
        <p>Your username: {username}</p>
        {typingUsersInTheRoom.length > 0 ? (
          <p>Typing: {typingUsersInTheRoom.join(', ')}</p>
        ) : null}
        {messagesOfRoom.map(({ message, username }, i) => {
          return (
            <div key={i} className='w-full px-4 py-4'>
              <b>Sent by: {username} </b>
              <p>{message}</p>
            </div>
          )
        })}
        <div className='flex-grow' />
        <div className='mb-8'>
          <div className='relative'>
            <textarea
              id='chat-input'
              className='block w-full resize-none rounded-xl border-none bg-slate-200 p-4  pr-20 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-400 dark:focus:ring-blue-600 sm:text-base'
              placeholder='Enter your message'
              rows='1'
              required
              onChange={(e) => {
                sendTypingIndicator()
                setMessage(e.target.value)
              }}
            />
            <button
              type='submit'
              onClick={() => sendMessage()}
              className='absolute bottom-2 right-2.5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:hover:bg-blue-700 dark:focus:ring-blue-800 sm:text-base'
            >
              Send <span className='sr-only'>Send message</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
