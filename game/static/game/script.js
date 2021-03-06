'use strict';
const socket = io.connect();

const overlay = document.querySelector('.overlay');
const starting_box = document.getElementById('starting-box');
const turn_sign = document.getElementById('turn-sign');
const allCells = document.querySelectorAll('.cell');
const my_score = document.getElementById('score1');
const score_opponent = document.getElementById('score2');
const chat_box = document.getElementById('chat-box');
const chat_area = document.getElementById('chat-area');
const result_banner = document.getElementById('result-banner');
const replay_request = document.getElementById('replay-request');
const replay_confirm = document.getElementById('replay-confirm');
const wait_for_replay = document.getElementById('wait-for-replay');

let move_index, isturn, player_name = '';

// Get game id from server
const get_room_url = function () {
    let room_url = document.getElementById('room_url');
    let game_id, is_host;
    if (room_url) {
        room_url = room_url.textContent.split('/');
        if (room_url.length > 3) {
            game_id = room_url[room_url.length - 1].toString();
            is_host = 1;
        }
        else {
            game_id = '';
        }
    }
    // In case joined by invited linked, use URL to get game id
    else {
        let current_page = window.location.href;
        current_page = current_page.split('/');
        if (current_page.length > 3) {
            game_id = current_page[current_page.length - 1].toString();
            is_host = 0;
        }
    }
    if (!game_id) {
        alert('There are no available room, please try again later');
    }
    return [game_id, is_host];
};
const [game_id, is_host] = get_room_url();

// Initialise page with hidden tags
const init = function (first_time_load) {
    if (first_time_load) {
        overlay.classList.remove('hidden');
        document.querySelector('.chat-container').classList.add('hidden');
    }
    if (is_host) {
        starting_box.classList.add('hidden');
    }
    replay_request.classList.remove('hidden');
    result_banner.classList.add('hidden');
    replay_confirm.classList.add('hidden');
    wait_for_replay.classList.add('hidden');
    document.querySelector('.new-game-box').classList.add('hidden');
    document.getElementById('replay-container').classList.add('hidden');
}
init(true);

const hide_tags_and_start_game = function (mode = '') {
    if (mode == 'ai') {
        document.getElementById('choose-game-type').classList.add('hidden');
    }
    overlay.classList.add('hidden');
    starting_box.classList.add('hidden');
}

const play_with_ai = function () {
    hide_tags_and_start_game('ai');
    isturn = 1;
    turn_sign.style.backgroundColor = '#77f077';
    socket.emit('start_game', { game_type: 'ai', game_id: game_id });
}

const play_with_human = function () {
    document.getElementById('choose-game-type').classList.add('hidden');
    starting_box.classList.remove('hidden');
}

// Get typed name 
// Send game infor to server and wait for other player to join game
const start_PvP_game = function () {
    player_name = document.getElementById("get-name-box").value;
    if (player_name) {
        if (is_host) {
            let msg = document.getElementById("welcome-msg").textContent;
            msg = msg + player_name + ',';
            document.getElementById("welcome-msg").textContent = msg
            document.querySelector('.new-game-box').classList.remove('hidden');
        }
        document.getElementById('name-box').classList.add('hidden');

        socket.emit('start_game', { game_type: 'human', game_id: game_id, player_name: player_name, is_host: is_host });
    }
}

// Incase user hit "Enter" key
// Call start_PvP_game function and continue
document.getElementById('get-name-box').addEventListener('keydown', (e) => {
    if (e.key == 'Enter') {
        start_PvP_game();
    }
})



const send_msg = function () {
    let chat_msg = chat_box.value;
    if (chat_msg) {
        socket.emit('send_msg', { game_id: game_id, chat_msg: chat_msg });
        const markup = `
            <div class="chat-msg-P2">
                <div></div>
                <p>${chat_msg}</p>
            </div>
            `;
        chat_area.insertAdjacentHTML('beforeend', markup);
        chat_area.scrollTop = chat_area.scrollHeight;
        chat_box.value = '';
    }
}

chat_box.addEventListener('keydown', (e) => {
    if (e.key == 'Enter') {
        send_msg();
    }
});


// Check every game cells to decide 'move' by turn
for (const element of allCells) {
    element.addEventListener('click', () => {
        if (!element.textContent & isturn) {
            let box_id = element.id;
            socket.emit('move', { game_id: game_id, move_index: box_id });
        }
    });
}


// Change color of winning nodes
const draw_winning_line = function (line, is_winner) {
    line.forEach(element => {
        document.getElementById(`${element}`).classList.add('winner-nodes');
    });
}

const draw_winner = function (line, is_winner) {
    if (line.length !== 0) {
        draw_winning_line(line, is_winner);
        if (is_winner) {
            result_banner.classList.remove('hidden');
            result_banner.children[0].textContent = 'You Win!'
            let score = my_score.children[0].textContent;
            my_score.children[0].textContent = parseInt(score) + 1
        }

        else {
            result_banner.classList.remove('hidden');
            result_banner.children[0].textContent = 'You Lose!'

            let score = score_opponent.children[0].textContent;
            score_opponent.children[0].textContent = parseInt(score) + 1
        }
    }
    else {
        result_banner.classList.remove('hidden');
        result_banner.children[0].textContent = 'Game Draw!'

    }
    window.setTimeout(() => {
        document.getElementById('replay-container').classList.remove('hidden')
    }, 1000);
}

// Process received message from server to display move
const updateMove = function (turn_of_current_move, move_index) {
    let move = document.getElementById(move_index);
    if (move) {
        if (turn_of_current_move) move.textContent = 'X';
        else move.textContent = 'O';
    }
};


/* Function "request_replay": 
    -- send request to sever
    -- wait for response from server*/
const request_replay = function () {
    socket.emit('request_replay', { game_id: game_id });
    replay_request.classList.add('hidden');
    wait_for_replay.classList.remove('hidden');
};

/* Fucntion "accept_replay": 
    -- send "accept" response to severz
    -- wait for server to create a new match */
const accept_replay = function () {
    socket.emit('accept_replay', { game_id: game_id });
    replay_confirm.classList.add('hidden');
    wait_for_replay.classList.remove('hidden');
};


const display_error = function (err_msg) {
    init(false);
    overlay.classList.remove('hidden');
    document.querySelector('.error').classList.remove('hidden');
    $('#error_msg').append(err_msg + '<br>');
}


// Handle received message from server to start game
socket.on('start_PvP_game', function (data) {
    // Display error message if:
    // Room is full or Wrong room id or Room is closed
    if (data.err_msg) {
        display_error(data.err_msg);
    }
    else {
        isturn = data.is_turn;
        if (isturn) turn_sign.style.backgroundColor = '#77f077';
        else turn_sign.style.backgroundColor = '#9a9a9a';

        document.getElementById('player1').children[0].textContent = player_name;
        document.getElementById('player2').children[0].textContent = data.opponent_name;
        document.querySelector('.bottom-bar').classList.remove('hidden');
        document.querySelector('.chat-container').classList.remove('hidden');

        hide_tags_and_start_game();
    }

});


socket.on('new_msg', function (data) {
    let chat_msg = data.chat_msg;
    if (chat_msg) {

        const markup = `
            <div class="chat-msg-P1">
                <p>${chat_msg}</p>
            </div>
            `;
        chat_area.insertAdjacentHTML('beforeend', markup);
        chat_area.scrollTop = chat_area.scrollHeight;
    }
});



// get move from server
socket.on('move', function (data) {
    // $('#log').append('<br>Received: ' + msg.data); 
    if (data.err_msg) {
        display_error(data.err_msg);
    }
    updateMove(data.turn_of_current_move, data.move_index);
    // Game end: display game draw or game win/lose
    if (data.is_turn == 2) {
        isturn = 0;
        draw_winner(data.winning_line_index, data.is_winner);

    }
    else isturn = data.is_turn;

    if (isturn) turn_sign.style.backgroundColor = '#77f077';
    else turn_sign.style.backgroundColor = '#9a9a9a';

});

/* Socket listen on "end_game" from server, if one player left game*/
socket.on('end_game', function (data) {
    isturn = data.is_turn;
    document.querySelector('.error').classList.remove('hidden');
    $('#error_msg').append(data.msg + '<br>');
    overlay.classList.toggle('hidden');
})


/* Socket listen on request_replay from server:
    -- render replay confirm box and send confirm msg to server */
socket.on('request_replay', function (data) {
    replay_confirm.classList.remove('hidden');
    replay_request.classList.add('hidden');

});


/* Socket listen on a msg "replay" from server:
    -- reset play board and start a new game  */
socket.on('replay', function (data) {
    for (const element of allCells) {
        if (element.classList.contains('winner-nodes')) {
            element.classList.remove('winner-nodes')
        }
        element.textContent = '';
    }
    init(false);
    isturn = data.is_turn;
    if (isturn) turn_sign.style.backgroundColor = '#77f077';
    else turn_sign.style.backgroundColor = '#9a9a9a';

    document.getElementById('replay-container').classList.add('hidden');
});


