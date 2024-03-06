const io = require('socket.io-client');
const socket = io(`http://10.45.76.113:3000/`);

let match = null

window.addEventListener('DOMContentLoaded', () => {
  let lobbyDiv = document.querySelector('#lobby')
  let playOptionsDiv = document.querySelector('#play-div')
  let nameInput = document.querySelector('#name-input')
  let nameForm = document.querySelector('#name-form')
  let createMatchBtn = document.querySelector("#create-match")
  let findMatchBtn = document.querySelector("#find-match")

  let matchDiv = document.querySelector('#match')
  let playerList = document.querySelector('#playerlist')
  let gameboard = document.querySelector('#gameboard')
  let startMatchBtn = document.querySelector('#start-match-btn')
  let playersDiv = document.querySelector('#players')
  let messageDiv = document.querySelector('#messages')
  let chatForm = document.querySelector("#chat-form")
  let chatInput = document.querySelector('#chat-input')
  let chatAnchor = document.querySelector('#anchor')
  let leaveBtn = document.querySelector("#leave-btn")
  let privacyBtn = document.querySelector('#privacy-btn')
  let gameoverDiv = document.querySelector('#gameover-div')
  let gameoverText = document.querySelector('#gameover-text')
  let gameoverBtn = document.querySelector('#gameover-btn')

  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency])
  }

  // Lobby
  nameForm.addEventListener('submit', (event) => {
    event.preventDefault()
    let name = nameInput.value
    socket.emit('name', name)
  })

  createMatchBtn.addEventListener("click", () => {
    socket.emit("match", { action: "create" })
  })

  findMatchBtn.addEventListener("click", () => {
    socket.emit("match", { action: "find" })
  })

  // Match
  startMatchBtn.addEventListener('click', () => {
    socket.emit("match", { action: "start", match})
  })

  chatForm.addEventListener("submit", (event) => {
    event.preventDefault()

    socket.emit("match", { action: "chat", match, message: chatInput.value })
    chatInput.value = ""
  })

  leaveBtn.addEventListener("click", () => {
    socket.emit("match", { action: "leave", match })
  })

  privacyBtn.addEventListener("click", () => {
    if(privacyBtn.value == "open"){
      privacyBtn.value = "closed"
      privacyBtn.innerText = "Lobby Is Closed"
      privacyBtn.classList.remove('btn-success')
      privacyBtn.classList.add('btn-danger')
    } else {
      privacyBtn.value = "open"
      privacyBtn.innerText = "Lobby Is Open"
      privacyBtn.classList.add('btn-success')
      privacyBtn.classList.remove('btn-danger')
    }

    socket.emit("match", { action: "privacy", privacy: privacyBtn.value, match })
  })

  gameoverBtn.addEventListener('click', () => {
    lobbyDiv.classList.remove("d-none")
    matchDiv.classList.add("d-none")
  })

  socket.on('name', () => {
    playOptionsDiv.classList.remove('d-none')
    nameForm.classList.add('d-none')
  })

  socket.on('match', (data) => {
    if (data.action == "join") {
      gameoverDiv.classList.add('d-none')
      gameboard.classList.add('d-none')
      playerList.classList.remove('d-none')
      if(data.match.creator == socket.id) {
        startMatchBtn.classList.remove('d-none')
        privacyBtn.removeAttribute('disabled')
      } else {
        startMatchBtn.classList.add('d-none')
        privacyBtn.setAttribute('disabled', 'true')
      }
      document.querySelectorAll('.message').forEach(element => {
        element.remove()
      })
      
      lobbyDiv.classList.add("d-none")
      matchDiv.classList.remove("d-none")
      match = data.match
    } 
    else if (data.action == "chat") {
      let msg = document.createElement('div')
      msg.className = 'message'
      msg.innerHTML = `<p>${data.author}: ${data.message}</p>`
      messageDiv.insertBefore(msg, chatAnchor)
    } 
    else if (data.action == "leave") {
      lobbyDiv.classList.remove("d-none")
      matchDiv.classList.add("d-none")
      match = null
    }
    else if (data.action == "update") {
      // lobby privacy
      if(data.match.privacy == "closed"){
        privacyBtn.innerText = "Lobby Is Closed"
        privacyBtn.classList.remove('btn-success')
        privacyBtn.classList.add('btn-danger')
      } else {
        privacyBtn.innerText = "Lobby Is Open"
        privacyBtn.classList.add('btn-success')
        privacyBtn.classList.remove('btn-danger')
      }

      // player list
      playersDiv.innerHTML = ``
      for (const [id, player] of Object.entries(data.match.players)) {
        console.log(id, player);
        playersDiv.innerHTML += `<div class="p-1 border rounded row"><i class="fa fa-user fs-4 col-1"></i><p class="m-0 col">${player.name}</p> </div>`
      }
    }
    else if (data.action == "start") {
      gameboard.innerHTML = ''
      startMatchBtn.classList.add('d-none')
      for(let r = 0; r < 3; r++)
      {
        let boardRow = document.createElement('div')
        boardRow.className = "gamerow"
        for(let t = 0; t < 3; t++)
        {
          let rowTile = document.createElement('div')
          rowTile.id = `r${r}t${t}`
          rowTile.className = "gametile"
          boardRow.appendChild(rowTile)
          
          rowTile.addEventListener('click', () => {
            socket.emit("match", { action: "player-move", match, move: {row: r, tile: t}})
          })
        }
        gameboard.appendChild(boardRow)
      }

      gameboard.classList.remove('d-none')
      playerList.classList.add('d-none')
    }
    else if(data.action == "updateBoard") {
      for(let r = 0; r < 3; r++)
      {
        for(let t = 0; t < 3; t++)
        {
          let tile = document.querySelector(`#r${r}t${t}`)
          tile.innerText = data.match.gameboard[r][t]
        }
      }
    } 
    else if(data.action == "winner") {
      match = null

      let isWinner = data.winner.id == socket.id
      if(isWinner)
      {
        gameoverText.innerHTML = 'Gameover You Won!'
        gameoverText.classList.remove('text-danger')
        gameoverText.classList.add('text-success')
      } else {
        gameoverText.innerHTML = 'Gameover You Lost!'
        gameoverText.classList.add('text-danger')
        gameoverText.classList.remove('text-success')
      }
      
      gameoverDiv.classList.remove('d-none')
    }
  })
})