const express = require('express')
const { createServer } = require('node:http')
const { Server } = require('socket.io')
const port = 3000

const app = express()
const server = createServer(app)
const io = new Server(server)

let matchIdCount = 0
let matchs = {}
function createMatch(socket)
{
    let id = `room${matchIdCount}`
    if(matchs[id]) return
    
    matchs[id] = {
        id,
        creator: socket.id,
        privacy: "open"
    }

    joinMatch(socket, id)
    matchIdCount += 1
}
function joinMatch(socket, matchId)
{
    if(!matchs[matchId]) return
    if(socket.rooms.size > 1) return
    
    socket.join(matchId)
    socket.emit('match', {
        action: 'join',
        match: matchs[matchId]
    })
}
function leaveMatch(socket, matchId)
{
    socket.emit('match', {action: 'leave'})
    socket.leave(matchId)
}
function findMatch(socket)
{
    console.log(`socket data: ${socket.id}; ${socket.rooms.size}`)

    if(socket.rooms.size > 1) return
    let match = null
    for(const [id, tempMatch] of Object.entries(matchs)) 
    {
        console.log(tempMatch)
        if (tempMatch.privacy == 'open') 
        {
            match = tempMatch
            break
        }
    }
    if(!match) return

    joinMatch(socket, match.id)
}

io.on('connection', socket => {
  socket.on('match', data => {
    if(data.action == "create")
    {
        createMatch(socket)
    } else if(data.action == "find")
    {
        findMatch(socket)
    } else if(data.action == "chat")
    {
        io.to(data.match.id).emit("match", {action: "chat", message: data.message})
    } else if(data.action == "leave")
    {
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