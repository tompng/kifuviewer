function $(id){return document.getElementById(id);}
var smartPhone;

var shogi;
function init(){
	var str=""+navigator.userAgent;
	var smartPhone=str.indexOf("iPhone")>=0||str.indexOf("Android")>=0||location.hash.indexOf("_smartphone_")>=0;
	if(smartPhone)setSmartPhone();
	loadImage();
	shogi=new Shogi();
	if(location.hash)window.onhashchange();
	else{shogi.reset();showLoadKifu();}
}
var currentHash="";
window.onhashchange=function(){
	var hash=location.hash.substring(1);
	if(currentHash==hash)return;
	setKifu(decodeKifu(hash),true);
}

function isFloatingLayerVisible(){return floatingLayerTimerFunc.opacityValue?true:false;}
function getFloatingLayer(){return $("floatingLayer");}
function hideFloatingLayer(){
	floatingLayerTimerFunc.opacityRate=-0.25;
	if(!floatingLayerTimerFunc.timer)floatingLayerTimerFunc();
}
function floatingLayerTimerFunc(){
	if(!floatingLayerTimerFunc.opacityValue)floatingLayerTimerFunc.opacityValue=0;
	floatingLayerTimerFunc.opacityValue+=floatingLayerTimerFunc.opacityRate;
	var endFlag=false;
	if(floatingLayerTimerFunc.opacityValue<=0){
		floatingLayerTimerFunc.opacityValue=0;
		$("floating").style.display="none";
		endFlag=true;
	}else{
		$("floating").style.display="block";
		if(floatingLayerTimerFunc.opacityValue>=1){
			floatingLayerTimerFunc.opacityValue=1;
			endFlag=true;
			$("floatingLayer").style.opacity=null;
			$("floatingLayer").style.filter=null;
			$("floatingBackground").style.opacity=0.5;
			$("floatingBackground").style.filter="alpha(opacity=50)";
		}else{
			$("floatingLayer").style.opacity=floatingLayerTimerFunc.opacityValue;
			$("floatingLayer").style.filter="alpha(opacity="+Math.round(100*floatingLayerTimerFunc.opacityValue)+")";
			$("floatingBackground").style.opacity=floatingLayerTimerFunc.opacityValue/2;
			$("floatingBackground").style.filter="alpha(opacity="+Math.round(100*floatingLayerTimerFunc.opacityValue/2)+")";
		}
	}
	if(endFlag)floatingLayerTimerFunc.timer=null;
	else floatingLayerTimerFunc.timer=setTimeout(floatingLayerTimerFunc,10);
}
function showFloatingLayer(){
	floatingLayerTimerFunc.opacityRate=+0.25;
	if(!floatingLayerTimerFunc.timer)floatingLayerTimerFunc();
}

var lastLoadKifu="";
function showLoadKifu(){
	var element=getFloatingLayer();
	element.innerHTML=
	"<div style='position:absolute;width:60%;left:17%;top:17%;'>"+
		"<div style='position:relative;width:100%;background:white;padding:3% 5%;'>"+
			"<textarea style=\"width:100%;max-width:100%;height:240px;max-height:240px;font-size:16px;\" id='kifutext'></textarea>"+
		"<div style='position:relative;padding-top:5px;'><button style='width:50%;font-size:20px;' onclick='hideFloatingLayer()'>cancel</button><button style='width:50%;font-size:20px;' onclick='hideFloatingLayer();readKifu()'>ok</button></div>"+
		"</div>"+
	"</div>"
	showFloatingLayer();
	var msg="ここに棋譜を貼り付けてください"
	$("kifutext").value=lastLoadKifu?lastLoadKifu:msg;
	$("kifutext").focus();
	$("kifutext").select();
	$("kifutext").onkeypress=function(e){
		if(e.keyCode==13&&(e.ctrlKey||e.metaKey||e.shiftKey)){hideFloatingLayer();readKifu();return false;}
		return true;
	}
	$("kifutext").onkeydown=function(e){
		if(e.keyCode==13&&(e.ctrlKey||e.metaKey||e.shiftKey)){hideFloatingLayer();readKifu();return false;}
		return true;
	}
}

function showHelp(){
	var element=getFloatingLayer();
	element.innerHTML=
	"<div style='position:absolute;width:60%;height:60%;left:20%;top:20%;background:white;overflow-y:scroll;font-size:12px;'>"+
		"<center style='font-size:18px'><b>How to use</b></center><ul>"+
		"<li><b>棋譜再生</b><br>マウスホイールや矢印キーで前/次の指し手へ<br></li><br>"+
		"<li><b>LOAD</b>(ショートカットキー:'L')<br>棋譜を貼付けてOKを押します</li><br>"+
		"<li><b>FLIP</b>(ショートカットキー:'F')<br>盤面を回転させます</li><br>"+
		"<li><b>HELP</b>(ショートカットキー:'H')<br>このHELP画面を表示します</li><br>"+
		"<li><b>効果音</b>(ショートカットキー:'S')<br>右上の音符マークで効果音のON/OFFを切り替えます</li><br>"+
		"<li><b>棋譜の共有</b><br>LOAD後のURLを友人に教えるだけ</li>"+
		"</ul>"+
	"</div>"
	showFloatingLayer();
}

function soundOnOff(){
//	alert("sound");
	var eee=null;
	try{
		$("soundbtnimg").style.top=shogi.sound.changeOnOff()?-36:0;
	}catch(e){eee=e;}
	//alert(eee);
}

function readKifu(){
	lastLoadKifu=$("kifutext").value;
	var data=encodeKifu(lastLoadKifu);
	location.hash="#"+(currentHash=data.compress);
	setKifu(data,false);
}
function setKifu(data,flag){
	shogi.reset(data.kifu,data.firstMap,ShogiData.defaultKoma,data.player,data.teaiwari,data.title,flag);
	return;
}


function setSmartPhone(){
	$("centermain").style.top=0;
	$("centermain").style.height="100%";
	$("shogi").parentNode.style.minWidth=$("shogi").parentNode.style.maxWidth=449;
	$("shogi").parentNode.style.cssText="width:0;height:0;left:50%;top:50%;position:absolute;";
	$("shogi").style.cssText="width:449;height:554;position:absolute;left:-225;top:-277;"
	$("migi").style.display="none";
	$("header").style.display="none";
	$("smartPhoneControl").style.display="block";
	document.body.style.marginTop=0;
	document.body.style.overflow="hidden";
	setTimeout(smartphoneResize,0);
}
function smartphoneResize(){
	var w=document.body.offsetWidth;
	var h=document.body.offsetHeight;
	var body=$("shogi").parentNode;
	var scale=Math.min(w/(449+10),h/(554+10));
	body.style.transform=body.style.WebkitTransform=body.style.MozTransform=body.style.OTransform="scale("+scale+","+scale+")";
}

var smartphoneSpeed=0;
var smartphoneTimer=0;
function touchfunc(e,flag){
	if(!flag){smartphoneSpeed=0;if(smartphoneTimer){clearTimeout(smartphoneTimer);smartphoneTimer=0;}return;}
	/**/if(e.layerX||e.layerY){var sgn=e.layerX>document.body.offsetWidth/2?1:-1;}else
	var sgn=e.touches[0].clientX>document.body.offsetWidth/2?1:-1;
	if(smartphoneSpeed*sgn<0)smartphoneSpeed=0;
	if(smartphoneSpeed==0){
		if(smartphoneTimer){clearTimeout(smartphoneTimer);smartphoneTimer=0;}
		if(sgn==0)return;
		smartphoneSpeed=sgn;
		if(shogi.movePrevNext(sgn))smartphoneTimer=setTimeout(smartphoneFunc,smartphoneSpeedFunc(0));
		return;
	}
	return;
}
function smartphoneSpeedFunc(n){
	if(n>10)n=10;
	return 1000/(n+1);
}
function smartphoneFunc(){
	smartphoneTimer=0;
	var speed=Math.abs(smartphoneSpeed);
	if(speed==0)return;
	var sgn=smartphoneSpeed/speed;
	if(!shogi.movePrevNext(sgn)){smartphoneSpeed=0;return;}
	smartphoneTimer=setTimeout(smartphoneFunc,smartphoneSpeedFunc(speed));
	smartphoneSpeed+=sgn;
}
