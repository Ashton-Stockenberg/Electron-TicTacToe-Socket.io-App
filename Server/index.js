const express = require('express')
const { match } = require('node:assert')
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
        hostShape: 'X',
        hostsMove: true,
        creator: socket.id,
        privacy: "open",
        players: {},
        gameboard: [
            ['', '', ''], ['', '', ''], ['', '', '']
        ]
    }

    joinMatch(socket, id)
    matchIdCount += 1
}

function updateMatch(matchId) {
    io.to(matchId).emit("match", { action: "update", match: matchs[matchId]})
}

function joinMatch(socket, matchId) {
    if (!matchs[matchId]) return
    if (socket.rooms.size > 1) return

    matchs[matchId].players[socket.id] = {
        name: socket.name
    }

    socket.matchId = matchId

    socket.join(matchId)
    socket.emit('match', {
        action: 'join',
        match: matchs[matchId]
    })
    updateMatch(matchId)
}

function leaveMatch(socket) {
    let match = matchs[socket.matchId]
    socket.matchId = null
    if (!match) return socket.emit('match', { action: 'leave' })

    if (socket.id == match.creator) {
        io.to(match.id).emit('match', { action: 'leave' })
        io.in(match.id).socketsLeave(match.id);
        return delete matchs[match.id]
    }

    delete matchs[match.id].players[socket.id]

    socket.leave(match.id)
    socket.emit('match', { action: 'leave' })
    
    updateMatch(match.id)
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

function checkWins(socket)
{
    let matchId = socket.matchId
    function sendWin(socket) {
        io.to(matchId).emit("match", { action: "winner", winner: {id: socket.id, name: socket.name}})
        io.in(matchId).socketsLeave(matchId);
        delete matchs[matchId]
    }

    let match = matchs[matchId]

    // h check
    for(let r = 0; r < 3; r++) 
    {
        let still = true
        let shape = match.gameboard[r][0]
        if(shape == '') continue
        for(let c = 1; c < 3; c++) 
        {
            console.log(match.gameboard[r][c])
            if(shape != match.gameboard[r][c])
            {
                still = false
            }
        }

        console.log(`h ${still}`)
        if(still) sendWin(socket)
    }

    // v check
    for(let c = 0; c < 3; c++) 
    {
        let still = true
        let shape = match.gameboard[c][0]
        if(shape == '') continue
        for(let r = 1; r < 3; r++) 
        {
            console.log(match.gameboard[c][r])
            if(shape != match.gameboard[c][r])
            {
                still = false
            }
        }

        console.log(`v ${still}`)
        if(still) sendWin(socket)
    }

    // d1 check
    {
        let still = true
        let shape = match.gameboard[0][0]
        if(shape != '')
        {
            for(let t = 1; t < 3; t++)
            {
                if(shape != match.gameboard[t][t])
                {
                    still = false
                }
            }

            console.log(`d1 ${still}`)
            if(still) sendWin(socket)
        }
    }

    // d2 check
    {
        let still = true
        let shape = match.gameboard[2][0]
        if(shape != '')
        {
            for(let t = 1; t < 3; t++)
            {
                if(shape != match.gameboard[3-t][t])
                {
                    still = false
                }
            }
            if(still) sendWin(socket)
        }
    }
}

function updateBoard(matchId)
{
    io.to(matchId).emit("match", { action: "updateBoard", match: matchs[matchId]})
}

function playerMove(socket, move) {
    let match = matchs[socket.matchId]
    let shape = (socket.id == match.creator) ? match.hostShape : (match.hostShape == 'X') ? 'O' : 'X'
    
    if((match.hostsMove && socket.id != match.creator) || (!match.hostsMove && socket.id == match.creator)) return
    if(match.gameboard[move.row][move.tile] != '') return;

    matchs[socket.matchId].gameboard[move.row][move.tile] = shape
    matchs[socket.matchId].hostsMove = !matchs[socket.matchId].hostsMove
    
    updateBoard(socket.matchId)
    checkWins(socket)
}

io.on('connection', socket => {
    socket.on('name', name => {
        socket.name = name
        socket.emit('name')
    })

    socket.on('match', data => {
        let match = matchs[socket.matchId]
        
        if(match) // If already in match
        {
            if (data.action == "chat") {
                io.to(match.id).emit("match", { action: "chat", author: socket.name, message: data.message })
            } else if (data.action == "leave") {
                leaveMatch(socket, match.id)
            } else if (data.action == "privacy") {
                if(match.creator != socket.id) return;
                match.privacy = data.privacy
                updateMatch(match.id)
            } else if (data.action == "start") {
                matchs[socket.matchId].privacy = "closed"
                matchs[socket.matchId].hostsMove = (match.hostShape == 'X') ? true : false
                io.to(socket.matchId).emit("match", { action: "start"})
            }
            else if(data.action == "player-move") {
                playerMove(socket, data.move)
            }
        } else { // If not in match
            if (data.action == "create") {
                createMatch(socket)
            } else if (data.action == "find") {
                findMatch(socket)
            }
        }
    })

    socket.on('disconnect', data => {
        leaveMatch(socket)
    })
})

server.listen(port, () => {
    console.log(`server running at http://localhost:${port}`);
})