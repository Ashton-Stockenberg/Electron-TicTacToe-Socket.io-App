const express = require('express')
const { createServer } = require('node:http')
const { Server } = require('socket.io')
const port = 3000

const app = express()
const server = createServer(app)
const io = new Server(server)

let matchIdCount = 0
let matchs = {}

function createMatch(socket) {
    let id = `room${matchIdCount}`
    if (matchs[id]) return

    matchs[id] = {
        id,
        creator: socket.id,
        privacy: "open"
    }

    joinMatch(socket, id)
    matchIdCount += 1
}

function joinMatch(socket, matchId) {
    if (!matchs[matchId]) return
    if (socket.rooms.size > 1) return

    socket.join(matchId)
    socket.emit('match', {
        action: 'join',
        match: matchs[matchId]
    })
}

function leaveMatch(socket, matchId) {
    let match = matchs[matchId]
    if (!match) return socket.emit('match', { action: 'leave' })

    if (socket.id == match.creator) {
        io.to(matchId).emit('match', { action: 'leave' })
        io.in(matchId).socketsLeave(matchId);
        return delete matchs[matchId]
    }

    socket.emit('match', { action: 'leave' })
    socket.leave(matchId)
}

function findMatch(socket) {
    if (socket.rooms.size > 1) return
    let match = null
    for (const [id, tempMatch] of Object.entries(matchs)) {
        if (tempMatch.privacy == 'open') {
            console.log(`${socket.id} joined ${tempMatch}`)
            match = tempMatch
            break
        }
    }
    if (!match) return

    joinMatch(socket, match.id)
}

io.on('connection', socket => {
    socket.on('name', name => {
        socket.name = name
        socket.emit('name')
    })

    socket.on('match', data => {
        if (data.action == "create") {
            createMatch(socket)
        } else if (data.action == "find") {
            findMatch(socket)
        } else if (data.action == "chat") {
            io.to(data.match.id).emit("match", { action: "chat", author: socket.name, message: data.message })
        } else if (data.action == "leave") {
            leaveMatch(socket, data.match.id)
        }
    })

    socket.on('disconnect', data => {
        leaveMatch(socket)
    })
})

server.listen(port, () => {
    console.log(`server running at http://localhost:${port}`);
})