/**
 * Components
 * Created by CreaturePhil - https://github.com/CreaturePhil
 *
 * These are custom commands for the server. This is put in a seperate file
 * from commands.js and config/commands.js to not interfere with them.
 * In addition, it is easier to manage when put in a seperate file.
 * Most of these commands depend on core.js.
 *
 * Command categories: General, Staff, Server Management
 *
 * @license MIT license
 */

var fs = require("fs");
    path = require("path"),
    http = require("http"),
    request = require('request');

var components = exports.components = {

	/********************************************************************
	* Shop Commands
	********************************************************************/

	money: 'atm',
    pd: 'atm',
    atm: function (target, room, user, connection) {
        if (!this.canBroadcast()) return;
        if (target.length >= 19) return this.sendReply('Los nombres de usuario tienen que tener menos de 19 caracteres de largo.');

        var targetUser = this.targetUserOrSelf(target);

        if (!targetUser) {
            var userId = toId(target);
            var money = Core.atm.money(userId);
			
            return this.sendReplyBox(Core.atm.name(false, target) + Core.atm.display('money', money) + '<br clear="all">');
        }

        var money = Core.atm.money(targetUser.userid);

        return this.sendReplyBox(Core.atm.name(true, targetUser) + Core.atm.display('money', money) + '<br clear="all">');
    },
	
	tienda: 'shop',
    shop: function (target, room, user) {
        if (!this.canBroadcast()) return;
        return this.sendReply('|html|' + Core.shop(true));
    },

    buy: function (target, room, user) {
        if (!target) this.parse('/help buy');
        var userMoney = Number(Core.stdin('money', user.userid));
        var shop = Core.shop(false);
        var len = shop.length;
        while (len--) {
            if (target.toLowerCase() === shop[len][0].toLowerCase()) {
                var price = shop[len][2];
                if (price > userMoney) return this.sendReply('No tienes suficiente PD para comprar esto. Necesitas ' + (price - userMoney) + 'para comprar ' + target + '.');
                Core.stdout('money', user.userid, (userMoney - price));
                if (target.toLowerCase() === 'simbolo') {
                    user.canCustomSymbol = true;
                    this.sendReply('Has comprado un simbolo personalizado. Vas a tener tu simbolo tras haber cerrado sesión por mas de una hora. Ahora puedes usar /customsymbol.');
                    this.sendReply('Si ya no quieres tu simbolo, puedes usar /resetsymbol para volver a tu viejo simbolo.');
                } else {
                    this.sendReply('Has comprado ' + target + '. Contacta a un Administrador para obtener ' + target + '.');
                }
                room.add(user.name + ' Ha comprado un ' + target + ' de la tienda.');
            }
        }
    },
	
	transferbuck: 'transfermoney',
    transferbucks: 'transfermoney',
    transfermoney: function (target, room, user) {
        if (!target) return this.parse('/help transfermoney');
        if (!this.canTalk()) return;

        if (target.indexOf(',') >= 0) {
            var parts = target.split(',');
            parts[0] = this.splitTarget(parts[0]);
            var targetUser = this.targetUser;
        }

        if (!targetUser) return this.sendReply('El nombre de usuario ' + this.targetUsername + ' es desconocido.');
        if (targetUser.userid === user.userid) return this.sendReply('No puedes transferirte dinero a ti mismo.');
        if (isNaN(parts[1])) return this.sendReply('Usa un numero real.');
        if (parts[1] < 1) return this.sendReply('No puedes transferir menos de un PD a la vez.');
        if (String(parts[1]).indexOf('.') >= 0) return this.sendReply('No puedes transferir PD con decimales.');

        var userMoney = Core.stdin('money', user.userid);
        var targetMoney = Core.stdin('money', targetUser.userid);

        if (parts[1] > Number(userMoney)) return this.sendReply('No puedes transferir mas PD de los que tienes.');

        var b = 'PokeDolares';
        var cleanedUp = parts[1].trim();
        var transferMoney = Number(cleanedUp);
        if (transferMoney === 1) b = 'PokeDolar';

        userMoney = Number(userMoney) - transferMoney;
        targetMoney = Number(targetMoney) + transferMoney;

        Core.stdout('money', user.userid, userMoney, function () {
            Core.stdout('money', targetUser.userid, targetMoney);
        });

        this.sendReply('Has transferido con éxito ' + transferMoney + ' ' + b + ' a ' + targetUser.name + '. Ahora tienes ' + userMoney + ' PD.');
        targetUser.send(user.name + ' ha transferido ' + transferMoney + ' ' + b + ' a tu cuenta. Ahora tienes ' + targetMoney + ' PD.');
		
		fs.appendFile('logs/transactions.log','\n'+Date()+': '+user.name+' transfirio '+transferMoney+' '+b+' para ' + targetUser.name + '. ' +  user.name +' ahora tiene ' + userMoney + ' ' + b + ' y ' + targetUser.name + '  ahora tiene ' + targetMoney + ' ' + b +'.');
    },
	
	givebuck: 'givemoney',
    givebucks: 'givemoney',
    givemoney: function (target, room, user) {
        if (!user.can('givemoney')) return;
        if (!target) return this.parse('/help givemoney');
 
        if (target.indexOf(',') >= 0) {
            var parts = target.split(',');
            parts[0] = this.splitTarget(parts[0]);
            var targetUser = this.targetUser;
        }
 
        if (!targetUser) return this.sendReply('El nombre de usuario ' + this.targetUsername + ' es desconocido.');
        if (isNaN(parts[1])) return this.sendReply('Usa un numero real.');
        if (parts[1] < 1) return this.sendReply('No puedes dar menos de un PD a la vez.');
        if (String(parts[1]).indexOf('.') >= 0) return this.sendReply('No puedes dar PD con decimales.');
 
        var b = 'PokeDolares';
        var cleanedUp = parts[1].trim();
        var giveMoney = Number(cleanedUp);
        if (giveMoney === 1) b = 'PokeDolar';
 
        var money = Core.stdin('money', targetUser.userid);
        var total = Number(money) + Number(giveMoney);
 
        Core.stdout('money', targetUser.userid, total);
 
        this.sendReply(targetUser.name + ' Ha obtenido ' + giveMoney + ' ' + b + '. Ahora este usuario tiene ' + total + ' PD.');
        targetUser.send(user.name + ' Te ha dado ' + giveMoney + ' ' + b + '. Ahora tienes ' + total + ' PD.');
               
                fs.appendFile('logs/transactions.log', '\n' + Date() + ': ' + targetUser.name + ' gano ' + giveMoney + ' ' + b + ' de ' + user.name + '. ' + 'Ahora el tiene ' + total + ' ' + b + '.');
    },

    takebuck: 'takemoney',
    takebucks: 'takemoney',
    takemoney: function (target, room, user) {
        if (!user.can('takemoney')) return;
        if (!target) return this.parse('/help takemoney');
 
        if (target.indexOf(',') >= 0) {
            var parts = target.split(',');
            parts[0] = this.splitTarget(parts[0]);
            var targetUser = this.targetUser;
        }
 
        if (!targetUser) return this.sendReply('El nombre de usuario ' + this.targetUsername + ' es desconocido.');
        if (isNaN(parts[1])) return this.sendReply('Usa un numero real.');
        if (parts[1] < 1) return this.sendReply('No puedes tomar menos de un PD a la vez.');
        if (String(parts[1]).indexOf('.') >= 0) return this.sendReply('No puedes tomar dinero con decimales.');
 
        var b = 'PokeDolares';
        var cleanedUp = parts[1].trim();
        var takeMoney = Number(cleanedUp);
        if (takeMoney === 1) b = 'PokeDolar';
 
        var money = Core.stdin('money', targetUser.userid);
        var total = Number(money) - Number(takeMoney);
 
        Core.stdout('money', targetUser.userid, total);
 
        this.sendReply(targetUser.name + ' Ha perdido ' + takeMoney + ' ' + b + '. Ahora este usuario tiene ' + total + ' PD.');
        targetUser.send(user.name + ' Ha tomado ' + takeMoney + ' ' + b + ' de tu cuenta. Ahora tienes ' + total + ' PD.');
		
		fs.appendFile('logs/transactions.log', '\n' + Date() + ': ' + user.name + ' Quito ' + takeMoney + ' ' + b + ' de ' + targetUser.name + '. ' + 'Ahora el tiene ' + total + ' ' + b + '.');
    },

	pdlog: 'moneylog',
	moneylog: function(target, room, user, connection) {
		if (!this.can('lock')) return false;
		try {
			var log = fs.readFileSync('logs/transactions.log','utf8');
            return user.send('|popup|'+log);
		} catch (e) {
			return user.send('|popup|You have not set made a transactions.log in the logs folder yet.\n\n ' + e.stack);
		}
	},
	
	simbolo: 'customsymbol',
	customsymbol: function (target, room, user) {
        if (!user.canCustomSymbol) return this.sendReply('Es necesario que compres este comando en la Tienda para usarlo.');
        if (!target || target.length > 1) return this.parse('/help customsymbol');
        if (target.match(/[A-Za-z\d]+/g) || '‽!+%@\u2605&~#'.indexOf(target) >= 0) return this.sendReply('Lo sentimos, pero no puedes cambiar el símbolo al que has escogido por razones de seguridad/estabilidad.');
        user.getIdentity = function (roomid) {
            if (!roomid) roomid = 'lobby';
            var name = this.name;
            if (this.locked) {
                return '‽' + name;
            }
            if (this.mutedRooms[roomid]) {
                return '!' + name;
            }
            var room = Rooms.rooms[roomid];
            if (room.auth) {
                if (room.auth[this.userid]) {
                    return room.auth[this.userid] + name;
                }
                if (room.isPrivate) return ' ' + name;
            }
            return target + name;
        };
        user.updateIdentity();
        user.canCustomSymbol = false;
        user.hasCustomSymbol = true;
    },

    resetsymbol: function (target, room, user) {
        if (!user.hasCustomSymbol) return this.sendReply('Tu no tienes un simbolo personalizado.');
        user.getIdentity = function (roomid) {
            if (!roomid) roomid = 'lobby';
            var name = this.name;
            if (this.locked) {
                return '‽' + name;
            }
            if (this.mutedRooms[roomid]) {
                return '!' + name;
            }
            var room = Rooms.rooms[roomid];
            if (room.auth) {
                if (room.auth[this.userid]) {
                    return room.auth[this.userid] + name;
                }
                if (room.isPrivate) return ' ' + name;
            }
            return this.group + name;
        };
        user.hasCustomSymbol = false;
        user.updateIdentity();
        this.sendReply('Tu simbolo se ha restablecido.');
    },

	/********************************************************************
	* Poll Commands
	********************************************************************/

	poll: function (target, room, user) {
        if (!this.can('broadcast')) return;
        if (Poll[room.id].question) return this.sendReply('En estos momentos hay una encuesta en curso.');
        if (!this.canTalk()) return;

        var options = Poll.splint(target);
        if (options.length < 3) return this.parse('/help poll');

        var question = options.shift();

        options = options.join(',').toLowerCase().split(',');

        Poll[room.id].question = question;
        Poll[room.id].optionList = options;

        var pollOptions = '';
        var start = 0;
        while (start < Poll[room.id].optionList.length) {
            pollOptions += '<button name="send" value="/vote ' + Poll[room.id].optionList[start] + '">' + Poll[room.id].optionList[start] + '</button>&nbsp;';
            start++;
        }
        Poll[room.id].display = '<h2>' + Poll[room.id].question + '&nbsp;&nbsp;<font size="1" color="#AAAAAA">/vote OPCIÓN</font><br><font size="1" color="#AAAAAA">Encuesta creada por <em>' + user.name + '</em></font><br><hr>&nbsp;&nbsp;&nbsp;&nbsp;' + pollOptions;
        room.add('|raw|<div class="infobox">' + Poll[room.id].display + '</div>');
    },

    tierpoll: function (target, room, user) {
        if (!this.can('broadcast')) return;
        this.parse('/poll Tournament tier?, ' + Object.keys(Tools.data.Formats).filter(function (f) { return Tools.data.Formats[f].effectType === 'Format'; }).join(", "));
    },

    endpoll: function (target, room, user) {
        if (!this.can('broadcast')) return;
        if (!Poll[room.id].question) return this.sendReply('No hay encuesta por finalizar en esta sala.');
 
        var votes = Object.keys(Poll[room.id].options).length;
 
        if (votes === 0) {
            Poll.reset(room.id);
            return room.add('|raw|<h3>La encuesta fue cancelada debido a la falta de votos.</h3>');
        }
 
        var options = {};
 
        for (var i in Poll[room.id].optionList) {
            options[Poll[room.id].optionList[i]] = 0;
        }
 
        for (var i in Poll[room.id].options) {
            options[Poll[room.id].options[i]]++;
        }
 
        var data = [];
        for (var i in options) {
            data.push([i, options[i]]);
        }
        data.sort(function (a, b) {
            return a[1] - b[1]
        });
 
        var results = '';
        var len = data.length;
        var topOption = data[len - 1][0];
        while (len--) {
            if (data[len][1] > 0) {
                results += '&bull; ' + data[len][0] + ' - ' + Math.floor(data[len][1] / votes * 100) + '% (' + data[len][1] + ')<br>';
            }
        }
        room.add('|raw|<div class="infobox"><h2>Resultado para "' + Poll[room.id].question + '"</h2><font size="1" color="#AAAAAA"><strong>Encuesta finalizada por <em>' + user.name + '</em></font><br><hr>' + results + '</strong></div>');
        Poll.reset(room.id);
        Poll[room.id].topOption = topOption;
    },
 
        vote: function (target, room, user) {
        if (!Poll[room.id].question) return this.sendReply('En estos momentos no hay una encuesta en curso.');
        if (!this.canTalk()) return;
        if (!target) return this.parse('/help vote');
        if (Poll[room.id].optionList.indexOf(target.toLowerCase()) === -1) return this.sendReply('\'' + target + '\' no es una opción para la encuesta actual.');
 
        var ips = JSON.stringify(user.ips);
        Poll[room.id].options[ips] = target.toLowerCase();
 
        return this.sendReply('Tu has votado por ' + target + '.');
    },
 
    votes: function (target, room, user) {
        if (!this.canBroadcast()) return;
        this.sendReply('NUMERO DE VOTOS: ' + Object.keys(Poll[room.id].options).length);
    },
 
    pr: 'pollremind',
    pollremind: function (target, room, user) {
        if (!Poll[room.id].question) return this.sendReply('En estos momentos no hay una encuesta en curso.');
        if (!this.canBroadcast()) return;
        this.sendReplyBox(Poll[room.id].display);
    },

	/********************************************************************
	* Other Commands
	********************************************************************/

	jugando: 'afk',
    ocupado: 'afk',
	ausente: 'afk', 
	away: 'afk', 
	afk: function(target, room, user, connection, cmd) {
		if (!this.canTalk) return false;
		var t = 'Away';
		switch (cmd) {
			case 'jugando':
			t = 'Јυԍаɴԁо';
			s = 'Jugando'
			break;
			case 'ocupado':
			t = 'Осυраԁо';
			s = 'Ocupado'
			break;
			default:
			t = 'Аυѕеɴте'
			s = 'Ausente'
			break;
		}

		if (!user.isAway) {
			user.originalName = user.name;
			var awayName = user.name + ' - '+t;
			//delete the user object with the new name in case it exists - if it does it can cause issues with forceRename
			delete Users.get(awayName);
			user.forceRename(awayName, undefined, true);

			if (user.isStaff) this.add('|raw|<b>-- <font color="#6c0000">' + Tools.escapeHTML(user.originalName) +'</font color></b> esta '+s.toLowerCase()+'. '+ (target ? " (" + escapeHTML(target) + ")" : ""));

			user.isAway = true;
			user.blockChallenges = true;
		}
		else {
			return this.sendReply('Tu estas como ausente, digita /back.');
		}

		user.updateIdentity();
	},

	back: 'unafk',
	regresar: 'unafk',
	unafk: function(target, room, user, connection) {
		if (!this.canTalk) return false;

		if (user.isAway) {
			if (user.name === user.originalName) {
				user.isAway = false; 
				return this.sendReply('Tu nombre no ha cambiado y ya no estas ausente.');
			}

			var newName = user.originalName;

			//delete the user object with the new name in case it exists - if it does it can cause issues with forceRename
			delete Users.get(newName);

			user.forceRename(newName, undefined, true);

			//user will be authenticated
			user.authenticated = true;

			if (user.isStaff) this.add('|raw|<b>-- <font color="#6c0000">' + Tools.escapeHTML(newName) + '</font color></b> regreso.');

			user.originalName = '';
			user.isAway = false;
			user.blockChallenges = false;
		}
		else {
			return this.sendReply('Tu no estas ausente.');
		}

		user.updateIdentity();
	},

    regdate: function (target, room, user, connection) {
        if (!this.canBroadcast()) return;
        if (!target || target == "." || target == "," || target == "'") return this.parse('/help regdate');
        var username = target;
        target = target.replace(/\s+/g, '');

        var options = {
            host: "www.pokemonshowdown.com",
            port: 80,
            path: "/forum/~" + target
        };

        var content = "";
        var self = this;
        var req = http.request(options, function (res) {

            res.setEncoding("utf8");
            res.on("data", function (chunk) {
                content += chunk;
            });
            res.on("end", function () {
                content = content.split("<em");
                if (content[1]) {
                    content = content[1].split("</p>");
                    if (content[0]) {
                        content = content[0].split("</em>");
                        if (content[1]) {
                            regdate = content[1];
                            data = username + ' se registro en' + regdate + '.';
                        }
                    }
                } else {
                    data = username + ' no esta registrado.';
                }
                self.sendReplyBox(data);
                room.update();
            });
        });
        req.end();
    },

	img: 'image',
        image: function(target, room, user) {
                if (!user.can('declare', null, room)) return false;
                if (!target) return this.sendReply('/image [url], [tamaño]');
                var targets = target.split(',');
                var url = targets[0];
                var width = targets[1];
                if (!url || !width) return this.sendReply('/image [url], [width percentile]');
                if (url.indexOf('.png') === -1 && url.indexOf('.jpg') === -1 && url.indexOf('.gif') === -1) {
                        return this.sendReply('La url debe terminar en .png, .jpg o .gif');
                }
                if (isNaN(width)) return this.sendReply('El tamaño debe ser un numero.');
                if (width < 1 || width > 100) return this.sendReply('El tamaño debe ser mayor que 0 y menor que 100.');
                this.add('|raw|<center><img width="'+width+'%" src="'+url+'"></center>');
        },
 
    u: 'urbandefine',
    ud: 'urbandefine',
    urbandefine: function (target, room, user) {
        if (!this.canBroadcast()) return;
        if (!target) return this.parse('/help urbandefine')
        if (target > 50) return this.sendReply('La frase no puede contener mas de 50 caractares.');
 
        var self = this;
        var options = {
            url: 'http://www.urbandictionary.com/iphone/search/define',
            term: target,
            headers: {
                'Referer': 'http://m.urbandictionary.com'
            },
            qs: {
                'term': target
            }
        };
 
        function callback(error, response, body) {
            if (!error && response.statusCode == 200) {
                var page = JSON.parse(body);
                var definitions = page['list'];
                if (page['result_type'] == 'no_results') {
                    self.sendReplyBox('No hay resultados para <b>"' + Tools.escapeHTML(target) + '"</b>.');
                    return room.update();
                } else {
                    if (!definitions[0]['word'] || !definitions[0]['definition']) {
                        self.sendReplyBox('No hay resultados para <b>"' + Tools.escapeHTML(target) + '"</b>.');
                        return room.update();
                    }
                    var output = '<b>' + Tools.escapeHTML(definitions[0]['word']) + ':</b> ' + Tools.escapeHTML(definitions[0]['definition']).replace(/\r\n/g, '<br />').replace(/\n/g, ' ');
                    if (output.length > 400) output = output.slice(0, 400) + '...';
                    self.sendReplyBox(output);
                    return room.update();
                }
            }
        }
        request(options, callback);
    },
 
    def: 'define',
    define: function (target, room, user) {
        if (!this.canBroadcast()) return;
        if (!target) return this.parse('/help define');
        target = toId(target);
        if (target > 50) return this.sendReply('La palabra no puede contener mas de 50 caracteres.');
 
        var self = this;
        var options = {
            url: 'http://api.wordnik.com:80/v4/word.json/' + target + '/definitions?limit=3&sourceDictionaries=all' +
                '&useCanonical=false&includeTags=false&api_key=a2a73e7b926c924fad7001ca3111acd55af2ffabf50eb4ae5',
        };
 
        function callback(error, response, body) {
            if (!error && response.statusCode == 200) {
                var page = JSON.parse(body);
                var output = '<b>Definiciones para ' + target + ':</b><br />';
                if (!page[0]) {
                    self.sendReplyBox('No hay resultados para <b>"' + target + '"</b>.');
                    return room.update();
                } else {
                    var count = 1;
                    for (var u in page) {
                        if (count > 3) break;
                        output += '(' + count + ') ' + page[u]['text'] + '<br />';
                        count++;
                    }
                    self.sendReplyBox(output);
                    return room.update();
                }
            }
        }
        request(options, callback);
    },
 
    masspm: 'pmall',
    pmall: function (target, room, user) {
        if (!this.can('pmall')) return;
        if (!target) return this.parse('/help pmall');
 
        var pmName = '~Hispano PM';
 
        for (var i in Users.users) {
            var message = '|pm|' + pmName + '|' + Users.users[i].getIdentity() + '|' + target;
            Users.users[i].send(message);
        }
    },
 
    clearall: function (target, room, user) {
        if (user.userid !== 'mrloser') return this.sendReply('/clearall - Access denied.');
        var len = room.log.length,
            users = [];
        while (len--) {
            room.log[len] = '';
        }
        for (var user in room.users) {
            users.push(user);
            Users.get(user).leaveRoom(room, Users.get(user).connections[0]);
        }
        len = users.length;
        setTimeout(function() {
            while (len--) {
                Users.get(users[len]).joinRoom(room, Users.get(users[len]).connections[0]);
            }
        }, 1000);
    },

    /*********************************************************
     * Server management commands
     *********************************************************/
	 
	debug: function (target, room, user, connection, cmd, message) {
        if (!user.hasConsoleAccess(connection)) {
            return this.sendReply('/debug - Access denied.');
        }
        if (!this.canBroadcast()) return;

        if (!this.broadcasting) this.sendReply('||>> ' + target);
        try {
            var battle = room.battle;
            var me = user;
            if (target.indexOf('-h') >= 0 || target.indexOf('-help') >= 0) {
                return this.sendReplyBox('This is a custom eval made by CreaturePhil for easier debugging.<br/>' +
                    '<b>-h</b> OR <b>-help</b>: show all options<br/>' +
                    '<b>-k</b>: object.keys of objects<br/>' +
                    '<b>-r</b>: reads a file<br/>' +
                    '<b>-p</b>: returns the current high-resolution real time in a second and nanoseconds. This is for speed/performance tests.');
            }
            if (target.indexOf('-k') >= 0) {
                target = 'Object.keys(' + target.split('-k ')[1] + ');';
            }
            if (target.indexOf('-r') >= 0) {
                this.sendReply('||<< Reading... ' + target.split('-r ')[1]);
                return this.popupReply(eval('fs.readFileSync("' + target.split('-r ')[1] + '","utf-8");'));
            }
            if (target.indexOf('-p') >= 0) {
                target = 'var time = process.hrtime();' + target.split('-p')[1] + 'var diff = process.hrtime(time);this.sendReply("|raw|<b>High-Resolution Real Time Benchmark:</b><br/>"+"Seconds: "+(diff[0] + diff[1] * 1e-9)+"<br/>Nanoseconds: " + (diff[0] * 1e9 + diff[1]));';
            }
            this.sendReply('||<< ' + eval(target));
        } catch (e) {
            this.sendReply('||<< error: ' + e.message);
            var stack = '||' + ('' + e.stack).replace(/\n/g, '\n||');
            connection.sendTo(room, stack);
        }
    }, 
	 
    reload: function (target, room, user) {
        if (!this.can('reload')) return;

        try {
            this.sendReply('Reloading CommandParser...');
            CommandParser.uncacheTree(path.join(__dirname, './', 'command-parser.js'));
            CommandParser = require(path.join(__dirname, './', 'command-parser.js'));

            this.sendReply('Reloading Tournaments...');
            var runningTournaments = Tournaments.tournaments;
            CommandParser.uncacheTree(path.join(__dirname, './', './tournaments/frontend.js'));
            Tournaments = require(path.join(__dirname, './', './tournaments/frontend.js'));
            Tournaments.tournaments = runningTournaments;

            this.sendReply('Reloading Core...');
            CommandParser.uncacheTree(path.join(__dirname, './', './core.js'));
            Core = require(path.join(__dirname, './', './core.js')).core;

            this.sendReply('Reloading Components...');
            CommandParser.uncacheTree(path.join(__dirname, './', './components.js'));
            Components = require(path.join(__dirname, './', './components.js'));

            return this.sendReply('|raw|<font color="green">All files have been reloaded.</font>');
        } catch (e) {
            return this.sendReply('|raw|<font color="red">Something failed while trying to reload files:</font> \n' + e.stack);
        }
    },

	roomlist: function (target, room, user) {
    if (!this.can('roomlist')) return;
 
    var rooms = Object.keys(Rooms.rooms),
        len = rooms.length,
        official = ['<b><font color="#1a5e00" size="2">Salas oficiales:</font></b><br><br>'],
        nonOfficial = ['<hr><b><font color="#000b5e" size="2">Salas no-oficiales:</font></b><br><br>'],
        privateRoom = ['<hr><b><font color="#5e0019" size="2">Salas privadas:</font></b><br><br>'];
 
    while (len--) {
        var _room = Rooms.rooms[rooms[(rooms.length - len) - 1]];
        if (_room.type === 'chat') {
 
            if (_room.isOfficial) {
                official.push(('<a href="/' + _room.title + '" class="ilink">' + _room.title + '</a> |'));
                continue;
            }
            if (_room.isPrivate) {
                privateRoom.push(('<a href="/' + _room.title + '" class="ilink">' + _room.title + '</a> |'));
                continue;
            }
            nonOfficial.push(('<a href="/' + _room.title + '" class="ilink">' + _room.title + '</a> |'));
 
        }
    }
 
    this.sendReplyBox(official.join(' ') + nonOfficial.join(' ') + privateRoom.join(' '));
},
 

};

Object.merge(CommandParser.commands, components);
