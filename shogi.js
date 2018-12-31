var komaImage=[];
var numberImage;
function loadImage(){
	var imgs=[1,2,3,4,5,6,7,8,11,12,13,14,16,17];
	for(var i=0;i<imgs.length;i++)for(var sgn=-1;sgn<=1;sgn+=2){
		(komaImage[imgs[i]*sgn]=new Image()).src="img/koma/"+imgs[i]*sgn+".png";
	}
	(numberImage=new Image()).src="img/number.png";
}
function getImage(k){
	var img=komaImage[k];
	komaImage[k]=img.cloneNode(false);
	return img;
}
function Shogi(){
	this.sound=new Sound();
	var obj=this;
	var wheelfunc=function(e){
		if(!window.isFloatingLayerVisible||isFloatingLayerVisible())return true;
		if(!e)e=event;
		var d=e.wheelDelta||-e.detail;
		var t=e.target;
		try{
			var migi=$("migi");
			while(t){
				if(t==migi){
					if(migi.scrollHeight!=$("migi_kifumain").offsetHeight)return true;
				}
				t=t.parentNode;
			}
		}catch(e){}
		if(d>0){
			var k=obj.kifu[obj.kifu.index-1];
			if(k)k.element.onclick();
		}
		if(d<0){
			var k=obj.kifu[obj.kifu.index+1];
			if(k)k.element.onclick();
		}
		return false;
	};
	if(window.addEventListener)window.addEventListener('DOMMouseScroll',wheelfunc,false);
	document.onmousewheel=wheelfunc;
}
Shogi.prototype.reset=function(kifu,shogimap,shogikoma,player,teaiwari,title,kifuflag){
	this.playerName=player?player:["",""];
	if(!this.playerName[0])this.playerName[0]="";
	if(!this.playerName[1])this.playerName[1]="";
	if(!title)title="";
	if(!title&&!this.playerName[0]&&!this.playerName[1])document.title="棋譜嫁";
	else document.title=(title?title+" ":"")+this.playerName[0]+" - "+this.playerName[1];
	$("title").lastChild.textContent=$("title").lastChild.innerText=title;
	
	$("teaiwari").textContent=$("teaiwari").innerText=teaiwari?"手合割："+teaiwari:"";
	
	$("migi_kifumain").innerHTML="";
	if(!shogimap)shogimap=Shogi.defaultMap;
	if(!shogikoma)shogikoma=Shogi.defaultKoma;
	if(!kifu)kifu=[];
	this.flip=false;
	this.currentPlayer=kifu[0]?kifu[0].player:0;
	this.updatePlayerBackground();
	
	this.komaochi=this.currentPlayer==1;
	
	this.animationQueue=[];
	this.animationTimer=0;
	var obj=this;
	this.kifu=[];
	this.kifu.index=-1;
	var d=document.createElement("DIV");d.innerHTML="対局開始";
	d.onclick=function(){
		obj.set(shogimap,shogikoma,0,obj.kifu[0]);
		obj.kifu.index=0;
		obj.currentkifu.className=null;
		obj.currentkifu=obj.kifu[0].element;
		obj.currentkifu.className="kifuitemSelected";
		$("migi_kifu").scrollTop=0;
	}
	this.currentkifu=d;
	d.className=null;
	$("migi_kifumain").appendChild(d);
	this.kifu[0]={element:d,index:0,player:kifu[0]?kifu[0].player:0};
	var kifutext="";
	for(var i=0;i<kifu.length;i++){
		if(i!=0)kifutext+="\n";
		kifutext+=this.addKifu(kifu[i]);
	}
	if(kifuflag){
		lastLoadKifu="棋戦："+title+"\n"+
			"手合割："+teaiwari+"\n"+
			"☗"+(this.komaochi?"下手":"先手")+"："+this.playerName[0]+"\n"+
			"☖"+(this.komaochi?"上手":"後手")+"："+this.playerName[1]+"\n"+
			"対局開始\n"+kifutext;
	}
	this.kifu.index=0;
	this.hasNext=function(){return obj.kifu[obj.kifu.index+1]?true:false;}
	this.hasPrev=function(){return obj.kifu[obj.kifu.index-1]?true:false;}
	this.movePrevNext=function(d){
		var k=obj.kifu[obj.kifu.index+d];
		if(k)k.element.onclick();	
		return k?true:false;
	}
	window.onkeydown=function(e){
		if(!window.isFloatingLayerVisible||isFloatingLayerVisible())return true;
		if(e.keyCode==38||e.keyCode==37){
			var k=obj.kifu[obj.kifu.index-1];
			if(k)k.element.onclick();
			return false;
		}if(e.keyCode==39||e.keyCode==40){
			var k=obj.kifu[obj.kifu.index+1];
			if(k)k.element.onclick();
			return false;
		}
		if(e.keyCode==76){showLoadKifu();return false;}
		if(e.keyCode==72){showHelp();return false;}
		if(e.keyCode==70){shogi.setFlip(!shogi.flip);return false;}
		if(e.keyCode==83){soundOnOff();return false;}
		return true;
	}
	$("migi_kifu").scrollTop=0;
	this.kifu[0].element.onclick();
	this.setFlip(false);
}
Shogi.prototype.set=function(map,koma,cp,lastkifu){
	this.animationQueue=[];
	this.currentPlayer=this.komaochi?1-cp:cp;
	this.updatePlayerBackground();
	$("shogiban").innerHTML="";
	this.koma=[[],[]];
	this.map=[[],[],[],[],[],[],[],[],[]];
	for(var i=0;i<9;i++)for(var j=0;j<9;j++){
		if(map[i][j]!=0){
			var k=this.map[i][j]=new Koma(map[i][j]);
			k.setPosition({x:i,y:j});
			if(k.position)
			k.setFlip(this.flip);
			$("shogiban").appendChild(k.element);
		}else this.map[i][j]=null;
	}
	for(var p=0;p<2;p++){
		for(var i=1;i<=8;i++){
			var k=this.koma[p][i]=new MochiGoma(p,i);
			this.koma[p][i].count=koma[p][i-1];
			k.setFlip(this.flip);
			$("shogiban").appendChild(k.element);
		}
	}
	$("currentmovelayer").innerHTML="";
	if(lastkifu&&lastkifu.data){
		if(lastkifu.data.src.k)
			$("currentmovelayer").appendChild(this.createCell(lastkifu.data.dst.i,lastkifu.data.dst.j,"red",0.2));
		else{
			$("currentmovelayer").appendChild(this.createCell(lastkifu.data.src.i,lastkifu.data.src.j,"red",0.1));
			$("currentmovelayer").appendChild(this.createCell(lastkifu.data.dst.i,lastkifu.data.dst.j,"red",0.2));
		}
	}
}

Shogi.prototype.updatePlayer=function(){
	if(this.flip){
		$("player2name").textContent=$("player2name").innerText=this.playerName[0];
		$("player1name").textContent=$("player1name").innerText=this.playerName[1];
		$("player2mode").textContent=$("player2mode").innerText="☗"+(this.komaochi?"下手":"先手");
		$("player1mode").textContent=$("player1mode").innerText="☖"+(this.komaochi?"上手":"後手");
	}else{
		$("player1name").textContent=	$("player1name").innerText=this.playerName[0];
		$("player2name").textContent=	$("player2name").innerText=this.playerName[1];
		$("player1mode").textContent=$("player1mode").innerText="☗"+(this.komaochi?"下手":"先手");
		$("player2mode").textContent=$("player2mode").innerText="☖"+(this.komaochi?"上手":"後手");
	}
	this.updatePlayerBackground();
}
Shogi.prototype.updatePlayerBackground=function(){
	var flag=this.currentPlayer==0;if(this.flip)flag=!flag;
	if(flag){
		$("player1bg").style.opacity=1;
		$("player1bg").style.filter="alpha(opacity=100)";
		$("player2bg").style.opacity=0.25;
		$("player2bg").style.filter="alpha(opacity=25)";
	}else{
		$("player2bg").style.opacity=1;
		$("player2bg").style.filter="alpha(opacity=100)";
		$("player1bg").style.opacity=0.25;
		$("player1bg").style.filter="alpha(opacity=25)";
	}
}
Shogi.komaChar=[null,"歩","香","桂","銀","金","飛","角","玉",null,null,"と","成香","成桂","成銀",null,"竜","馬"];
Shogi.numberChar1=["１","２","３","４","５","６","７","８","９"]
Shogi.numberChar2=["一","二","三","四","五","六","七","八","九"];
Shogi.defaultMap=[
[-2,0,-1,0,0,0,1,0,2],
[-3,-7,-1,0,0,0,1,6,3],
[-4,0,-1,0,0,0,1,0,4],
[-5,0,-1,0,0,0,1,0,5],
[-8,0,-1,0,0,0,1,0,8],
[-5,0,-1,0,0,0,1,0,5],
[-4,0,-1,0,0,0,1,0,4],
[-3,-6,-1,0,0,0,1,7,3],
[-2,0,-1,0,0,0,1,0,2]];
Shogi.komaochiMap={
"八枚落ち":
	[[0,0,-1,0,0,0,1,0,2],
	[0,0,-1,0,0,0,1,6,3],
	[0,0,-1,0,0,0,1,0,4],
	[-5,0,-1,0,0,0,1,0,5],
	[-8,0,-1,0,0,0,1,0,8],
	[-5,0,-1,0,0,0,1,0,5],
	[0,0,-1,0,0,0,1,0,4],
	[0,0,-1,0,0,0,1,7,3],
	[0,0,-1,0,0,0,1,0,2]],
"六枚落ち":
	[[0,0,-1,0,0,0,1,0,2],
	[0,0,-1,0,0,0,1,6,3],
	[-4,0,-1,0,0,0,1,0,4],
	[-5,0,-1,0,0,0,1,0,5],
	[-8,0,-1,0,0,0,1,0,8],
	[-5,0,-1,0,0,0,1,0,5],
	[-4,0,-1,0,0,0,1,0,4],
	[0,0,-1,0,0,0,1,7,3],
	[0,0,-1,0,0,0,1,0,2]],
"四枚落ち":
	[[0,0,-1,0,0,0,1,0,2],
	[-3,0,-1,0,0,0,1,6,3],
	[-4,0,-1,0,0,0,1,0,4],
	[-5,0,-1,0,0,0,1,0,5],
	[-8,0,-1,0,0,0,1,0,8],
	[-5,0,-1,0,0,0,1,0,5],
	[-4,0,-1,0,0,0,1,0,4],
	[-3,0,-1,0,0,0,1,7,3],
	[0,0,-1,0,0,0,1,0,2]],
"二枚落ち":
	[[-2,0,-1,0,0,0,1,0,2],
	[-3,0,-1,0,0,0,1,6,3],
	[-4,0,-1,0,0,0,1,0,4],
	[-5,0,-1,0,0,0,1,0,5],
	[-8,0,-1,0,0,0,1,0,8],
	[-5,0,-1,0,0,0,1,0,5],
	[-4,0,-1,0,0,0,1,0,4],
	[-3,0,-1,0,0,0,1,7,3],
	[-2,0,-1,0,0,0,1,0,2]],
"香落ち":
	[[0,0,-1,0,0,0,1,0,2],
	[-3,-7,-1,0,0,0,1,6,3],
	[-4,0,-1,0,0,0,1,0,4],
	[-5,0,-1,0,0,0,1,0,5],
	[-8,0,-1,0,0,0,1,0,8],
	[-5,0,-1,0,0,0,1,0,5],
	[-4,0,-1,0,0,0,1,0,4],
	[-3,-6,-1,0,0,0,1,7,3],
	[-2,0,-1,0,0,0,1,0,2]],
"右香落ち":
	[[-2,0,-1,0,0,0,1,0,2],
	[-3,-7,-1,0,0,0,1,6,3],
	[-4,0,-1,0,0,0,1,0,4],
	[-5,0,-1,0,0,0,1,0,5],
	[-8,0,-1,0,0,0,1,0,8],
	[-5,0,-1,0,0,0,1,0,5],
	[-4,0,-1,0,0,0,1,0,4],
	[-3,-6,-1,0,0,0,1,7,3],
	[0,0,-1,0,0,0,1,0,2]],
"角落ち":
	[[-2,0,-1,0,0,0,1,0,2],
	[-3,0,-1,0,0,0,1,6,3],
	[-4,0,-1,0,0,0,1,0,4],
	[-5,0,-1,0,0,0,1,0,5],
	[-8,0,-1,0,0,0,1,0,8],
	[-5,0,-1,0,0,0,1,0,5],
	[-4,0,-1,0,0,0,1,0,4],
	[-3,-6,-1,0,0,0,1,7,3],
	[-2,0,-1,0,0,0,1,0,2]],
"飛車落ち":
	[[-2,0,-1,0,0,0,1,0,2],
	[-3,-7,-1,0,0,0,1,6,3],
	[-4,0,-1,0,0,0,1,0,4],
	[-5,0,-1,0,0,0,1,0,5],
	[-8,0,-1,0,0,0,1,0,8],
	[-5,0,-1,0,0,0,1,0,5],
	[-4,0,-1,0,0,0,1,0,4],
	[-3,0,-1,0,0,0,1,7,3],
	[-2,0,-1,0,0,0,1,0,2]],
"飛香落ち":
	[[0,0,-1,0,0,0,1,0,2],
	[-3,-7,-1,0,0,0,1,6,3],
	[-4,0,-1,0,0,0,1,0,4],
	[-5,0,-1,0,0,0,1,0,5],
	[-8,0,-1,0,0,0,1,0,8],
	[-5,0,-1,0,0,0,1,0,5],
	[-4,0,-1,0,0,0,1,0,4],
	[-3,0,-1,0,0,0,1,7,3],
	[-2,0,-1,0,0,0,1,0,2]]
}
Shogi.nullMap=[
[0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0]];
Shogi.defaultKoma=[[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]];
Shogi.shogiCoordMap={
	"1":0,"2":1,"3":2,"4":3,"5":4,"6":5,"7":6,"8":7,"9":8,
	"１":0,"２":1,"３":2,"４":3,"５":4,"６":5,"７":6,"８":7,"９":8,
	"一":0,"二":1,"三":2,"四":3,"五":4,"六":5,"七":6,"八":7,"九":8
}
Shogi.komaStringMap={
	1:"歩",2:"香",3:"桂",4:"銀",5:"金",6:"飛",7:"角",8:"玉",
	11:"と",12:"成香",13:"成桂",14:"成銀",16:"竜",17:"馬"
};
Shogi.komaNumberMap={
	"歩":1,"香":2,"桂":3,"銀":4,"金":5,"飛":6,"角":7,"玉":8,"王":8,
	"と":11,"成香":12,"成桂":13,"成銀":14,"竜":16,"龍":16,"馬":17
};

Shogi.prototype.addKifu=function(kifu){
	var k;
	var d=document.createElement("DIV");
	d.style.position="relative";
	d.innerHTML="<span><nobr></nobr></span><span style='position:absolute;left:160px;top:0;color:gray;'><nobr></nobr></span>";
	var txt1="☗☖".charAt(kifu.player);
	var txt2="";
	if(kifu.src.k){
		txt1+=Shogi.numberChar1[kifu.dst.i]+Shogi.numberChar2[kifu.dst.j]+Shogi.komaChar[kifu.src.k]+"打";
	}else{
		txt1+=Shogi.numberChar1[kifu.dst.i]+Shogi.numberChar2[kifu.dst.j];
		if(kifu.dst.nari){
			txt1+=Shogi.komaChar[kifu.koma]+"成";
		}else{
			txt1+=Shogi.komaChar[kifu.koma];
		}
		txt2="("+(kifu.src.i+1)+(kifu.src.j+1)+")";
	}
	var k={data:kifu,element:d,index:this.kifu.length};
	this.kifu.push(k);
	var txt0="000"+k.index;txt0=txt0.substring(txt0.length-3);
	d.firstChild.firstChild.textContent=d.firstChild.firstChild.innerText=txt0+"　"+txt1;
	d.lastChild.firstChild.textContent=d.lastChild.firstChild.innerText=txt2;
	$("migi_kifumain").appendChild(d);
	var obj=this;
	d.onclick=function(){
		if(obj.kifu.index==k.index-1){
			if(k.data.src.k)obj.put(k.data.player,k.data.dst.i,k.data.dst.j,k.data.koma,k.index);
			else obj.move(k.data.src.i,k.data.src.j,k.data.dst.i,k.data.dst.j,k.data.dst.nari,k.index);
		}else{
			obj.set(k.data.data.map,k.data.data.koma,k.index%2,k);
			obj.currentkifu.className=null;
			obj.currentkifu=obj.kifu[k.index].element;
			obj.currentkifu.className="kifuitemSelected";
		}
		obj.kifu.index=k.index;
		var btny=24*k.index;
		if(btny<$("migi_kifu").scrollTop)$("migi_kifu").scrollTop=btny;
		if(btny>$("migi_kifu").scrollTop+$("migi_kifu").offsetHeight-24)$("migi_kifu").scrollTop=btny-$("migi_kifu").offsetHeight+24;
	}
	return txt0+"　"+txt1+txt2;
}

Shogi.prototype.animationPush=function(animation){
	if(!this.animationFunc){
		var obj=this;
		this.animationFunc=function(){
			obj.animationTimer=0;
			var anm=obj.animationQueue[0];
			if(!anm)return;
			if(!anm(obj.animationQueue.length))obj.animationQueue.shift();
			obj.animationTimer=setTimeout(obj.animationFunc,16);
		}
	}
	this.animationQueue.push(animation);
	if(!this.animationTimer)this.animationFunc();
}
Shogi.prototype.put=function(p,x,y,k,kindex){
	var obj=this;
	var koma=null;
	var animation=function(n){
		if(!koma){
			koma=new Koma((1-2*p)*k);
			koma.setPosition({player:p,koma:k});
			koma.setDestination({x:x,y:y});
			obj.komaUpdate(p,k,-1);
			$("shogiban").appendChild(koma.element);
			koma.setFlip(obj.flip);
			$("currentmovelayer").innerHTML="";
			obj.currentkifu.className=null;
			obj.currentkifu=obj.kifu[kindex].element;
			obj.currentkifu.className="kifuitemSelected";
		}
		var val=koma.move(0.1+(n-1)/5);
		if(!val){
			obj.map[x][y]=koma;
			obj.sound.play();
			obj.currentPlayer=1-obj.currentPlayer;
			obj.updatePlayerBackground();
			$("currentmovelayer").appendChild(obj.createCell(x,y,"red",0.2));
		}
		return val;
	}
	this.animationPush(animation);
}
Shogi.prototype.createCell=function(x,y,col,opa){
	var div=document.createElement("DIV");
	div.style.position="absolute";
	div.style.width=43;div.style.height=48;
	div.style.background=col;
	div.style.opacity=opa;
	div.style.filter="alpha(opacity="+Math.round(100*opa)+")";
	x=31+43*(9-x-0.5);y=61+48*(y+0.5);
	if(this.flip){x=449-x;y=554-y;}
	div.style.left=x-43/2;
	div.style.top=y-48/2;
	return div;
}
Shogi.prototype.move=function(x1,y1,x2,y2,nari,kindex){
	var obj=this;
	var koma=null;
	var animation=function(n){
		if(!koma){
			koma=obj.map[x1][y1];
			koma.setDestination({x:x2,y:y2,nari:nari});
			$("currentmovelayer").innerHTML="";
			$("currentmovelayer").appendChild(obj.createCell(x1,y1,"red",0.1));
			obj.currentkifu.className=null;
			obj.currentkifu=obj.kifu[kindex].element;
			obj.currentkifu.className="kifuitemSelected";
		}
		var val=koma.move(0.1+(n-1)/5);
		if(!val){
			var pkoma=obj.map[x2][y2];
			if(pkoma){
				$("shogiban").removeChild(pkoma.element);
				var k=pkoma.koma;
				var p=1;if(k<0){p=0;k*=-1;}if(k>10)k-=10;
				obj.komaUpdate(p,k,1);
			}
			obj.map[x1][y1]=null;
			obj.map[x2][y2]=koma;
			obj.sound.play();
			obj.currentPlayer=1-obj.currentPlayer;
			obj.updatePlayerBackground();
			$("currentmovelayer").appendChild(obj.createCell(x2,y2,"red",0.2));
		}
		return val;
	}
	this.animationPush(animation);
}
Shogi.prototype.komaUpdate=function(p,k,d){
	this.koma[p][k].count+=d;
	this.koma[p][k].update();
}
Shogi.prototype.setFlip=function(flip){
	if(this.flip!=flip){
		var o=$("currentmovelayer").childNodes;
		for(var i=0;i<o.length;i++){
			o[i].style.left=449-43-parseInt(o[i].style.left)
			o[i].style.top=554-48-parseInt(o[i].style.top)
		}
	}
	this.flip=flip;
	for(var i=0;i<9;i++)for(var j=0;j<9;j++){
		if(this.map[i][j])this.map[i][j].setFlip(flip);
	}
	for(var p=0;p<2;p++)for(var i=1;i<8;i++)this.koma[p][i].setFlip(flip);
	$("shogi_bg").style.transform=$("shogi_bg").style.MozTransform=$("shogi_bg").style.WebkitTransform=$("shogi_bg").style.OTransform=flip?"rotate(180deg)":null;
	$("shogi_bg").style.filter=flip?"progid:DXImageTransform.Microsoft.BasicImage(rotation=2)":null;
	
	this.updatePlayer();
}

Shogi.prototype.calcClickPosition=function(x,y){
	var ix=Math.floor((31+43*9-x)/43);
	var iy=Math.floor((y-61)/48);
	if(0<=ix&&ix<=8&&0<=iy&&iy<=8){
		return this.flip?{x:8-ix,y:8-iy}:{x:ix,y:iy};
	}
	if(554-25-48/2<=y&&y<=554-25+48/2){
		var koma=Math.floor((45*8-x)/45);
		if(1<=koma&&koma<=7)return {player:this.flip?1:0,koma:koma};
		return null;
	}
	if(25-48/2<=y&&y<=25+48/2){
		var koma=Math.floor((45*8-(450-x))/45);
		if(1<=koma&&koma<=7)return {player:this.flip?0:1,koma:koma};
		return null;
	}
	return null;
}




function MochiGoma(player,koma){
	this.player=player;
	this.koma=koma;this.count=0;
	this.element=document.createElement("DIV");
	this.img=new Image();
	this.text=document.createElement("CENTER");
	
	this.num1=document.createElement("DIV");
	this.num2=document.createElement("DIV");
	this.num1.appendChild(numberImage.cloneNode(false));
	this.num2.appendChild(numberImage.cloneNode(false));
	this.num1.className="number_";
	this.num2.className="number_";
	this.text.style.cssText="width:36;line-height:28px;position:absolute;left:16;top:19;height:28;font-size:24px;color:blue";
	this.element.appendChild(this.img);
	this.element.appendChild(this.text);
	
	this.text.appendChild(this.num1);
	this.text.appendChild(this.num2);
	this.element.style.position="absolute";
}
MochiGoma.prototype.select=function(flag){
	this.element.style.background=flag?"red":null;
	if(flag){
		this.element.style.opacity=0.5;
		this.element.style.filter="alpha(opacity=50)";
	}else{
		this.element.style.opacity=1;
		this.element.style.filter="alpha(opacity=100)";
	}
}
MochiGoma.prototype.setFlip=function(flip){
	this.flip=flip;
	var newimg=getImage((flip?-1:1)*(1-2*this.player)*this.koma);
	newimg.style.cssText=this.img.style.cssText;
	this.element.replaceChild(newimg,this.img);
	this.img=newimg;
	this.update();
}
MochiGoma.prototype.update=function(){
	y=554-25;x=45*(7-this.koma)+43/2;
	if(this.koma==8)x=45*7+43/2;
	if(this.player==1){x=449-x;y=554-y;}
	if(this.flip){x=449-x;y=554-y;}
	this.element.style.left=x-43/2;this.element.style.top=y-48/2;
	this.element.style.display=this.count?"block":"none";
	if(this.count<=1){this.num1.className=this.num2.className="number_"}
	else{
		this.num2.className="number"+this.count%10;
		this.num1.className=this.count<10?"number_":"number"+Math.floor(this.count/10);
	}
}

function Koma(koma){
	this.koma=koma;
	this.time=0;
	var img=this.element=new Image();
	img.style.position="absolute";
}
Koma.prototype.select=function(flag){
	this.element.style.background=flag?"red":null;
	if(flag){
		this.element.style.opacity=0.5;
		this.element.style.filter="alpha(opacity=50)";
	}else{
		this.element.style.opacity=1;
		this.element.style.filter="alpha(opacity=100)";
	}
	if(flag==false){$("selectlayer").innerHTML="";return;}
}
Koma.prototype.genSelect=function(o){
	var div=document.createElement("DIV");
	div.style.cssText="position:absolute;width:43;height:48;background:red"
	div.style.opacity=0.1;
	div.style.filter="alpha(opacity=10)";
	var p=this.calcPosition(o);
	div.style.left=p.x-43/2;div.style.top=p.y-48/2;
	return div;
}
Koma.prototype.setFlip=function(flip){
	this.flip=flip;
	var newimg=getImage((this.flip?-1:1)*this.koma);
	newimg.style.cssText=this.element.style.cssText;
	if(this.element.parentNode)this.element.parentNode.replaceChild(newimg,this.element);
	this.element=newimg;
	this.update();
}
Koma.prototype.setPosition=function(o){
	this.position=o;
}
Koma.prototype.setDestination=function(o){
	this.time=0;
	this.destination=o;
}
Koma.prototype.calcPosition=function(o){
	var x,y;
	if(o.koma){
		y=554-25;x=45*(7-o.koma)+43/2;
		if(o.koma==8)x=45*7+43/2;
		if(o.player==1){x=449-x;y=554-y;}
	}else{x=31+43*(9-o.x-0.5);y=61+48*(o.y+0.5);}
	if(this.flip){x=449-x;y=554-y;}
	return {x:x,y:y};
}
Koma.prototype.update=function(){
	var x0,y0;
	var p0=this.calcPosition(this.position);
	if(this.time==0){this.element.style.left=p0.x-43/2;this.element.style.top=p0.y-48/2;return;}
	var p1=this.calcPosition(this.destination);
	var t=this.time;
	this.element.style.left=p1.x*t+(1-t)*p0.x-43/2;
	this.element.style.top=p1.y*t+(1-t)*p0.y-48/2;
}
Koma.prototype.move=function(dt){
	this.time+=dt;
	this.element.style.zIndex=100;
	if(this.time>=1){
		this.time=0;
		this.position=this.destination;
		this.destination=null;
		if(this.position.nari){
			this.koma+=this.koma<0?-10:10;
			var newimg=getImage((this.flip?-1:1)*this.koma);
			newimg.style.cssText=this.element.style.cssText;
			if(this.element.parentNode)this.element.parentNode.replaceChild(newimg,this.element);
			this.element=newimg;
		}
		var x=this.position.x,y=this.position.y;
		this.update();
		this.element.style.zIndex=0;
		return false;
	}
	this.update();
	return true;
}
