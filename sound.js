function Sound(){
	this.audio=null;
	this.volume=0;
}
Sound.prototype.load=function(){
	var n=4;
	var src=generateSoundURL();
	if(window.Audio){
		var a=new Audio();
		a.src=src;
		this.audio=[a];
		for(var i=1;i<n;i++)this.audio[i]=a.cloneNode(false);
	}
	this.cnt=0;
}
Sound.prototype.changeOnOff=function(){
	if(!this.audio)this.load();
	this.volume=this.volume?0:1;
	return this.volume?true:false;
}
Sound.prototype.play=function(){
	if(this.volume==0)return;
	var a=this.audio[this.cnt++%this.audio.length];
	try{a.currentTime=0;}catch(e){}
	a.play();
}

function Base64Encoder(){
	this.data="";
	this.cnt=0;
	this.buf=0;
}
Base64Encoder.chars="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
Base64Encoder.prototype.push=function(b){
	switch(this.cnt%3){
		case 0:
			this.data+=Base64Encoder.chars[b>>2];
			this.buf=(b%4)<<4;
			break;
		case 1:
			this.data+=Base64Encoder.chars[this.buf|(b>>4)];
			this.buf=(b%16)<<2;
			break;
		case 2:
			this.data+=Base64Encoder.chars[this.buf|(b>>6)]+Base64Encoder.chars[b%64];
			break;
	}
	this.cnt++;
}
Base64Encoder.prototype.toDataURL=function(type){
	if(this.cnt%3==0)return "data:"+type+";base64,"+this.data;
	return "data:"+type+";base64,"+this.data+Base64Encoder.chars[this.buf]+"==".substr(this.cnt%3-1);
}

function generateSoundURL(){	
	function binary(x,size){
		var s="";
		for(var i=0;i<size;i++)s+=String.fromCharCode((x>>(8*i))&0xff);
		return s;
	}
	function addNoise(array,volume){
		var tmp=[],n=array.length;
		for(var i=0;i<n;i++)tmp[i]=2*Math.random()-1;
		var a=0,b=0;
		var paramA=-0.5,paramB=-paramA*paramA;
		for(var i=0;i<n;i++){
			a=paramA*a+tmp[i];
			b=paramB*b+tmp[i];
		}
		for(var i=0;i<n;i++){
			a=paramA*a+tmp[i];
			b=paramB*b+tmp[i];
			array[i]+=volume*(2*a-b);
		}
		for(var i=n-1;i>=0;i--){
			a=paramA*a+tmp[i];
			b=paramB*b+tmp[i];
		}
		for(var i=n-1;i>=0;i--){
			a*=paramA;b*=paramB;
			array[i]+=volume*(2*a-b);
			a+=tmp[i];b+=tmp[i];
		}
	}
	function stretch2(array){
		var n=array.length;
		for(var i=n-1;i>=0;i--){
			array[2*i]=array[i];
		}
		n*=2;
		for(var i=1;i<n;i+=2)
			array[i]=(9*(array[(i+n-1)%n]+array[(i+1)%n])-array[(i+n-3)%n]-array[(i+3)%n])/16
	}
	function stretch(array,length){
		var n=array.length;
		var out=[];
		for(var i=0;i<length;i++){
			var x=i*n/length;
			var xi=Math.floor(x);x-=xi;
			var a=array[xi%n],b=array[(xi+1)%n];
			var d=b-a;
			out[i]=a+x*d
		}
		return out;
	}
	
	var FREQ=44100;
	N=(32000-44)/2;
	var base64encoder=new Base64Encoder();
	var header="RIFF"+binary(2*N+44-8,4)+"WAVEfmt "+binary(16,4)+binary(1,2)+binary(1,2)+binary(FREQ,4)+binary(FREQ*2,4)+binary(2,2)+binary(16,2)+"data"+binary(2*N,4);
	for(var i=0;i<header.length;i++)base64encoder.push(header.charCodeAt(i));
	
	var M=4,arrays=[];
	for(var i=0;i<M;i++){
		arrays[i]=[];
		size=800/Math.pow(2,i/M);
		for(var j=0;j<size;j++)arrays[i][j]=0;
	}
	for(var n=-3;n<=0;n++){
		for(var i=0;i<M;i++){
			stretch2(arrays[i]);
			var k=n-i/M;
			var ee=Math.exp(2*(k+2.6));
			addNoise(arrays[i],ee/(1+ee)-0.2);
		}
	}
	var array=arrays[0];
	for(var i=1;i<M;i++){
		arrays[i]=stretch(arrays[i],array.length);
		for(var j=0;j<array.length;j++)array[j]+=arrays[i][j];
	}
	var av=0;
	for(var i=0;i<array.length;i++){
		av=(av*i+(array[i]*array[i]))/(i+1);
	}
	av=Math.sqrt(av);
	var volume=1,decay=Math.exp(-1/FREQ/0.06);
	
	for(var i=0;i<N;i++){
		var val=volume*array[i%array.length]/av/4;
		val*=0x8000;
		if(val<-0x8000)val=-0x8000;if(val>=0x8000)val=0x8000-1;if(val<0)val+=0x10000;
		base64encoder.push(val&0xff);
		base64encoder.push(val>>8);
		volume*=decay;
	}
	return base64encoder.toDataURL("audio/wav");
}


