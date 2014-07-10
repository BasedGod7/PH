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
