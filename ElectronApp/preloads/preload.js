const io = require('socket.io-client');
const socket = io(`http://localhost:3000`);

let match = null

window.addEventListener('DOMContentLoaded', () => {
  let lobbyDiv = document.querySelector('#lobby')
  let playOptionsDiv = document.querySelector('#play-div')
  let nameDiv = document.querySelector('#name-div')
  let nameInput = document.querySelector('#name-input')
  let nameBtn = document.querySelector('#name-btn')
  let createMatchBtn = document.querySelector("#create-match")
  let findMatchBtn = document.querySelector("#find-match")

  let matchDiv = document.querySelector('#match')
  let chatBox = document.querySelector('#chat-box')
  let chatForm = document.querySelector("#chat-form")
  let chatInput = document.querySelector('#chat-input')
  let leaveBtn = document.querySelector("#leave-btn")
  let privacyBtn = document.querySelector('#privacy-btn')

  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency])
  }

  // Lobby
  nameBtn.addEventListener('click', () => {
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

  socket.on('name', () => {
    playOptionsDiv.classList.remove('d-none')
    nameDiv.classList.add('d-none')
  })

  socket.on('match', (data) => {
    console.log(data)
    if (data.action == "join") {
      if(data.match.creator == socket.id) privacyBtn.classList.remove('d-none')
      else privacyBtn.classList.add('d-none')

      chatBox.innerHTML = ''
      lobbyDiv.classList.add("d-none")
      matchDiv.classList.remove("d-none")
      match = data.match
    } else if (data.action == "chat") {
      chatBox.innerHTML += `<p>${data.author}: ${data.message}</p>`
    } else if (data.action == "leave") {
      lobbyDiv.classList.remove("d-none")
      matchDiv.classList.add("d-none")
      match = null
    }
  })
})