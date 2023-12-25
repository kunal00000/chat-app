// Websocket block
const { Server } = require('socket.io')
const { nanoid } = require('nanoid')
const { createServer } = require('http')
const express = require('express')
const appWebsocket = express()
const server = createServer(appWebsocket)
server.listen(3001, () => {
  console.log('Websocket Server is running on http://localhost:3001')
})

const io = new Server(server, {
  // transports: ['websocket'],
  cors: { origin: '*' }
})

const roomIdToMessageMapping = {}

io.on('connection', (socket) => {
  socket.on('sendMessage', ({ roomId, message, username }) => {
    const finalMessage = {
      ...{ roomId, message, username },
      messageId: nanoid()
    }

    roomIdToMessageMapping[roomId] = roomIdToMessageMapping[roomId] || []
    roomIdToMessageMapping[roomId].push(finalMessage)

    io.to(roomId).emit('roomMessage', finalMessage)
  })

  socket.on('sendTypingIndicator', ({ roomId, username }) => {
    io.to(roomId).emit('userTyping', { roomId, username })
  })

  socket.on('join-room-exclusively', (room) => {
    if (room >= 1 && room <= 50) {
      // ok
    } else {
      socket.emit('error-from-server', 'Invalid room number')
      return
    }

    socket.rooms.forEach((roomIAmPartOf) => {
      socket.leave(roomIAmPartOf) // leave all rooms I am part of
    })

    socket.join(room)
    const messages = roomIdToMessageMapping[room] || []
    for (const message of messages) {
      socket.emit('roomMessage', message)
    }
    socket.emit('You joined ' + room)
  })
})
// setInterval(() => {
//   io.to('room1').emit(new Date().toString())
//   io.to('room2').emit(Math.floor(Math.random() * 1000))
// }, 1000)
