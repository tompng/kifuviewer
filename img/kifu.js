function chop(str){
	var cutchar=" \t\r\n　";
	var i=0,j=str.length;
	while(i<j&&cutchar.indexOf(str.charAt(i))>=0)i++;
	while(i<j&&cutchar.indexOf(str.charAt(j-1))>=0)j--;
	return str.substring(i,j);
}
function encodeKifu(txt){
	var txtsplit=txt.split("\n");
	txt="";
	var keyval={};
	for(var i=0;i<txtsplit.length;i++){
		var line=txtsplit[i];
		if(line.charAt(0)=="*")continue;
		var colon=line.match(/^(.+)：(.+)/);
		if(colon){
			keyval[chop(colon[1])]=chop(colon[2]);
		}else{
			txt+=line+"\n";
		}
	}
	txt=txt.match(/[^\n^▲^△^☗^☖]+/g);
	var kifu=[],player=["",""];
	var pstr=[["先手","下手","☗先手","☗下手"],["後手","上手","☖後手","☖上手"]];
	for(var p=0;p<2;p++)for(var i=0;i<pstr[p].length;i++)if(keyval[pstr[p][i]]){player[p]=keyval[pstr[p][i]];break;}
	var encoder=new PairEncoder();
	var teaiwari=keyval["手合割"];
	if(!teaiwari||!ShogiData.teaiwariNumberMap[teaiwari])teaiwari="平手";
	var teaiwariID=ShogiData.teaiwariNumberMap[teaiwari];
	var firstMap=ShogiData.teaiwariMap[teaiwari];
	
	if(teaiwariID){
		encoder.pushUInt(TAGKEYMAP["手合割"].id);
		encoder.pushUInt(teaiwariID);
	}
	if(player[0]){
		encoder.pushUInt(TAGKEYMAP["先手"].id);
		encoder.pushString(player[0]);
	}
	if(player[1]){
		encoder.pushUInt(TAGKEYMAP["後手"].id);
		encoder.pushString(player[1]);
	}
	if(keyval["棋戦"]){
		encoder.pushUInt(TAGKEYMAP["棋戦"].id);
		encoder.pushString(keyval["棋戦"]);
	}
	
	var sd=new ShogiData(firstMap,ShogiData.defaultKoma);
	var lastXY=[];
	
	var buf=[];
	buf.pushPair=function(a,b){if(b==0||a<0){throw "kifuerror"}buf.push([a,b])};

	try{
		for(var i=0;i<txt.length;i++){
			var o=parseKifuItem(buf,sd,kifu.length,txt[i],lastXY,teaiwariID!=0);
			if(o){
				lastXY=[o.dst.i,o.dst.j];
				kifu.push(o);
			}
		}
	}catch(e){
		return {kifu:[],compress:"",player:["",""],firstMap:ShogiData.defaultMap,teaiwari:"平手",title:""}
	}
	encoder.pushUInt(0);
	encoder.pushUInt(buf.length/2);
	for(var i=0;i<buf.length;i++)encoder.pushPair(buf[i][0],buf[i][1]);
	return {kifu:kifu,compress:encoder.encode(),player:player,firstMap:firstMap,teaiwari:teaiwari,title:keyval["棋戦"]};
}
var TAGIDMAP=[];
var TAGKEYMAP={
	"手合割":{id:1,type:"uint"},
	"先手":{id:2,type:"string"},
	"後手":{id:3,type:"string"},
	"棋戦":{id:4,type:"string"}
};
for(var k in TAGKEYMAP){
	var v=TAGKEYMAP[k]
	TAGIDMAP[v.id]={key:k,type:v.type};
}
function decodeKifu(txt){
	var decoder=new PairDecoder(txt);
	var info={};
	while(true){
		var tagid=decoder.decodeUInt();
		if(tagid==0)break;
		var key=TAGIDMAP[tagid].key;
		var type=TAGIDMAP[tagid].type;
		switch(type){
			case "uint":
				info[key]=decoder.decodeUInt();
				break;
			case "string":		
				info[key]=decoder.decodeString();
				break;
		}
	}
	var teaiwariID=info["手合割"];if(!teaiwariID)teaiwariID=0;
	var teaiwari=ShogiData.teaiwariNameMap[teaiwariID];
	var firstMap=ShogiData.teaiwariMap[teaiwari];
	var sd=new ShogiData(firstMap,ShogiData.defaultKoma);
	var kifu=[];
	var player=[];
	player[0]=info["先手"];
	player[1]=info["後手"];
	var count=decoder.decodeUInt();
	for(var i=0;i<count;i++){
		var k=sd.next(decoder,null,(i+(teaiwariID==0?0:1))%2);
		k.data=sd.getCopy();
		k.data.count=i;
		kifu.push(k);
	}
	return {kifu:kifu,player:player,firstMap:firstMap,teaiwari:teaiwari,title:info["棋戦"]};
}


var COMPRESSCHAR="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
var COMPRESSMOD=COMPRESSCHAR.length;
function PairEncoder(){this.pair=[];}
PairEncoder.prototype.pushPair=function(a,b){this.pair.push([a,b]);}
PairEncoder.prototype.pushString=function(str){
	this.pushUInt(str.length);
	for(var i=0;i<str.length;i++){
		var code=str.charCodeAt(i);
		if(code<0x80){this.pair.push([0,2]);this.pair.push([code,0x80]);}
		else{this.pair.push([1,2]);this.pair.push([code,0x10000]);}
	}
}
PairEncoder.prototype.pushUInt=function(n){
	var m=1;
	while(true){
		m*=4;
		if(n<m){this.pair.push([0,3]);break;}
		m*=4;
		if(n<m){this.pair.push([1,3]);break;}
		this.pair.push([2,3]);
	}
	this.pair.push([n,m]);
}
PairEncoder.prototype.encode=function(){
	var data=[0];
	for(var i=this.pair.length-1;i>=0;i--){
		var a=this.pair[i][0],b=this.pair[i][1];
		for(var j=0;j<data.length||a;j++){
			if(!data[j])data[j]=0;
			data[j]=data[j]*b+a;
			a=Math.floor(data[j]/COMPRESSMOD);
			data[j]%=COMPRESSMOD;
		}
	}
	var str="";
	for(var i=0;i<data.length;i++)str+=COMPRESSCHAR.charAt(data[i]);
	return str+"/";
}
function PairDecoder(str){
	var map={};for(var i=0;i<COMPRESSCHAR.length;i++)map[COMPRESSCHAR.charAt(i)]=i;
	this.data=[];
	for(var i=0;i<str.length;i++){
		var x=map[str.charAt(i)];
		if(x==undefined)break;
		this.data[i]=x;
	}
}
PairDecoder.prototype.decode=function(n){
	var x=0;
	for(var i=this.data.length-1;i>=0;i--){
		x=x*COMPRESSMOD+this.data[i];
		this.data[i]=Math.floor(x/n);
		x%=n;
	}
	while(this.data[this.data.length-1]==0)this.data.pop();
	return x;
}
PairDecoder.prototype.decodeString=function(){
	var len=this.decodeUInt(),str="";
	for(var i=0;i<len;i++){
		if(this.decode(2)==0)str+=String.fromCharCode(this.decode(0x80));
		else str+=String.fromCharCode(this.decode(0x10000));
	}
	return str;
}
PairDecoder.prototype.decodeUInt=function(){
	var m=1;
	while(true){
		m*=4;
		var k=this.decode(3);
		if(k==0)break;
		m*=4;
		if(k==1)break;
	}
	return this.decode(m);
}



function parseKifuItem(stream,sd,num,str,prevdst,flip){
	var koma=null,komanum=0,komacnt;
	for(var c in ShogiData.komaNumberMap){
		var kn=ShogiData.komaNumberMap[c];
		if(str.indexOf(c)>=0){
			komacnt++;
			if(kn>komanum){
				komanum=kn;
				koma=c;
			}
		}
	}
	if(komacnt>2||!koma)return;
	
	var komaindex=str.indexOf(koma);
	var dst;
	if(str.indexOf("同")!=-1)dst=prevdst;
	else{
		dst=[];
		var cnt=2;
		for(var i=komaindex-1;i>=0;i--){
			var c=str.charAt(i);
			var z=ShogiData.shogiCoordMap[c];
			if(z!=undefined){dst[--cnt]=z;if(cnt==0)break;}
			else{
				if(c!=" "&&c!="\t"&&c!="　"&&c!="_"&&c!="＿"&&c!="-"&&c!="ー")return;
			}
		}
		if(cnt!=0)return;
	}
	
	var str2=str.substr(komaindex+koma.length);
	var src=null;
	var match=str2.match(/\([1-9][1-9]\)/);
	if(match&&match.length>=2)return;
	if(match)src=[parseInt(match[0].charAt(1))-1,parseInt(match[0].charAt(2))-1];
	
	var stat="";
	if(str2.indexOf("打")!=-1)stat="打";
	if(str2.indexOf("成")!=-1)stat="成";
	if(str2.indexOf("不")!=-1)stat="";
	
	var m="";
	var mm="上引左右寄直";
	for(var i=0;i<mm.length;i++){
		var mi=mm.charAt(i);
		if(str2.indexOf(mi)!=-1)m+=mi;
	}
	var p=(num+(flip?1:0))%2;
	var kifu=sd.genCmd(p,src,dst,komanum,m,stat);
	sd.next(stream,kifu);
	kifu.data=sd.getCopy();
	kifu.data.count=num;
	return kifu;
}


function ShogiData(map,koma){
	this.map=map;this.koma=koma;
	var obj=this.getCopy();
	this.map=obj.map;this.koma=obj.koma;
}
ShogiData.prototype.getCopy=function(){
	var obj={map:[[],[],[],[],[],[],[],[],[]],koma:[[],[]]};
	for(var i=0;i<9;i++)for(var j=0;j<9;j++)obj.map[i][j]=this.map[i][j];
	for(var p=0;p<2;p++)for(var k=0;k<8;k++)obj.koma[p][k]=this.koma[p][k];
	return obj;
}
ShogiData.prototype.next=function(stream,kifu,p){
	if(kifu)p=kifu.player;
	var sgn=1-2*p;
	var srcList=[];
	var dstList=[];
	var src,dst,k;
	for(var i=0;i<9;i++)for(var j=0;j<9;j++){
		if(this.map[i][j]*sgn>0){
			srcList.push({i:i,j:j});
		}
	}
	for(var k=1;k<=8;k++){
		if(this.koma[p][k-1]>0){
			srcList.push({p:p,k:k});
		}
	}
	if(kifu){
		src=kifu.src;
		var srcid=-1;
		for(var i=0;i<srcList.length;i++){
			if(src.k?(src.k==srcList[i].k):(src.i==srcList[i].i&&src.j==srcList[i].j)){srcid=i;break;}
		}
		stream.pushPair(srcid,srcList.length);
	}else src=srcList[stream.decode(srcList.length)];
	var koma;
	
	if(src.k){
		var k=src.k;
		koma=k*sgn;
		for(var i=0;i<9;i++){
			if(k==1){
				var f2=false;
				for(var j=0;j<9;j++)if(this.map[i][j]==sgn)f2=true;
				if(f2)continue;
			}
			for(var j=0;j<9;j++){
				if(this.map[i][j]==0){
					dstList.push({i:i,j:j});
				}
			}
		}
		if(kifu){
			var dstid=-1;
			dst=kifu.dst;
			for(var i=0;i<dstList.length;i++){
				if(dst.i==dstList[i].i&&dst.j==dstList[i].j){dstid=i;break;}
			}
			stream.pushPair(dstid,dstList.length);
		}else dst=dstList[stream.decode(dstList.length)];
		this.koma[p][src.k-1]--;
		this.map[dst.i][dst.j]=src.k*sgn;
	}else{
		koma=this.map[src.i][src.j];
		var ak=Math.abs(koma);
		var nari=ak<8&&ak!=5;
		var nariCheck=function(y1,y2){return p==0?y1<=2||y2<=2:y1>=6||y2>=6};
		var gin=[[-1,-1],[0,-1],[1,-1],[-1,1],[1,1]];
		var kin=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[0,1]];
		var gyoku=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
		var uma=[[0,-1],[-1,0],[1,0],[0,1]];
		var ryu=[[-1,-1],[1,-1],[-1,1],[1,1]];
		var si=src.i,sj=src.j;
		switch(ak){
			case 1:
				dstList.push({i:si,j:sj-sgn,nari:false});
				if(nari&&nariCheck(sj,sj-sgn))dstList.push({i:si,j:sj-sgn,nari:true});
				break;
			case 2:
				for(var j=sj-sgn;0<=j&&j<9;j-=sgn){
					if(this.map[si][j]*sgn<=0){
						dstList.push({i:si,j:j,nari:false});
						if(nariCheck(sj,j))dstList.push({i:si,j:j,nari:true});
						if(this.map[si][j]!=0)break;
					}
				}
				break;
			case 3:
				for(var i=-1;i<=1;i+=2){
					var di=si+i,dj=sj-2*sgn;
					if(0<=di&&di<9&&0<=dj&&dj<9&&this.map[di][dj]*sgn<=0){
						dstList.push({i:di,j:dj,nari:false})
						if(nariCheck(sj,dj))dstList.push({i:di,j:dj,nari:true})
					}
				}
				break;
			case 4:
				for(var i=0;i<gin.length;i++){
					var di=si+gin[i][0],dj=sj+gin[i][1]*sgn;
					if(0<=di&&di<9&&0<=dj&&dj<9&&this.map[di][dj]*sgn<=0){
						dstList.push({i:di,j:dj,nari:false})
						if(nariCheck(sj,dj))dstList.push({i:di,j:dj,nari:true})
					}
				}
				break;
			case 5:case 11:case 12:case 13:case 14:
				for(var i=0;i<kin.length;i++){
					var di=si+kin[i][0],dj=sj+kin[i][1]*sgn;
					if(0<=di&&di<9&&0<=dj&&dj<9&&this.map[di][dj]*sgn<=0){
						dstList.push({i:di,j:dj,nari:false})
					}
				}
				break;
			case 8:
				for(var i=0;i<gyoku.length;i++){
					var di=si+gyoku[i][0],dj=sj+gyoku[i][1]*sgn;
					if(0<=di&&di<9&&0<=dj&&dj<9&&this.map[di][dj]*sgn<=0){
						dstList.push({i:di,j:dj,nari:false})
					}
				}
				break;
			case 16:
				for(var i=0;i<ryu.length;i++){
					var di=si+ryu[i][0],dj=sj+ryu[i][1]*sgn;
					if(0<=di&&di<9&&0<=dj&&dj<9&&this.map[di][dj]*sgn<=0){
						dstList.push({i:di,j:dj,nari:false})
					}
				}
			case 6:
				for(var i=0;i<4;i++){
					var d=[[1,0],[-1,0],[0,1],[0,-1]][i];
					for(var j=1;j<9;j++){
						var di=si+d[0]*j,dj=sj+d[1]*j;
						if(di<0||di>=9||dj<0||dj>=9)break;
						if(this.map[di][dj]*sgn<=0){
							dstList.push({i:di,j:dj,nari:false})
							if(nari&&nariCheck(sj,dj))dstList.push({i:di,j:dj,nari:true})
						}
						if(this.map[di][dj]!=0)break;
					}
				}
				break;
			case 17:
				for(var i=0;i<uma.length;i++){
					var di=si+uma[i][0],dj=sj+uma[i][1]*sgn;
					if(0<=di&&di<9&&0<=dj&&dj<9&&this.map[di][dj]*sgn<=0){
						dstList.push({i:di,j:dj,nari:false})
					}
				}
			case 7:
				for(var i=0;i<4;i++){
					var d=[[1,1],[1,-1],[-1,1],[-1,-1]][i];
					for(var j=1;j<9;j++){
						var di=si+d[0]*j,dj=sj+d[1]*j;
						if(di<0||di>=9||dj<0||dj>=9)break;
						if(this.map[di][dj]*sgn<=0){
							dstList.push({i:di,j:dj,nari:false})
							if(nari&&nariCheck(sj,dj))dstList.push({i:di,j:dj,nari:true})
						}
						if(this.map[di][dj]!=0)break;
					}
				}
				break;
		}
		if(kifu){
			dst=kifu.dst;
			var dstid=-1;
			for(var i=0;i<dstList.length;i++){
				if(dst.i==dstList[i].i&&dst.j==dstList[i].j&&dst.nari==dstList[i].nari){dstid=i;break;}
			}
			stream.pushPair(dstid,dstList.length);
		}else{
			dst=dstList[stream.decode(dstList.length)];
		}
		var k2=this.map[dst.i][dst.j]
		if(k2)this.koma[p][Math.abs(k2)%10-1]++;
		this.map[src.i][src.j]=0;
		this.map[dst.i][dst.j]=koma+(dst.nari?10:0)*sgn;
	}
	return kifu?kifu:{player:p,src:src,dst:dst,koma:Math.abs(koma)};
}

ShogiData.prototype.genCmd=function(p,pxy,xy,k,m,s){
	this.map[-1]=this.map[9]=[];
	var sgn=1-2*p;
	var x=xy[0],y=xy[1];
	var n=s=="成";
	var ak=k;
	k*=1-2*p;
	if(s=="打")return {player:p,src:{p:p,k:ak},dst:{i:x,j:y,nari:false},koma:ak};
	var arr=[];
	if(k==1||k==-1){
		if(this.map[x][y+sgn]==k)arr.push([0,sgn]);
	}if(k==2||k==-2){
		for(var i=y+sgn;0<=i&&i<9;i+=sgn){
			if(this.map[x][i]==k)arr.push([0,i-y]);
			if(this.map[x][i])break;
		}
	}
	if(k==3||k==-3){
		if(this.map[x-sgn][y+2*sgn]==k)arr.push([-sgn,2*sgn]);
		if(this.map[x+sgn][y+2*sgn]==k)arr.push([+sgn,2*sgn]);
	}
	if(k==4||k==-4){
		if(this.map[x-1][y-1]==k)arr.push([-1,-1]);
		if(this.map[x][y+sgn]==k)arr.push([0,sgn]);
		if(this.map[x+1][y-1]==k)arr.push([+1,-1]);
		if(this.map[x-1][y+1]==k)arr.push([-1,+1]);
		if(this.map[x+1][y+1]==k)arr.push([+1,+1]);
	}
	if(k==5||(11<=k&&k<=14)||k==-5||(-14<=k&&k<=-11)){
		if(this.map[x-1][y+sgn]==k)arr.push([-1,sgn]);
		if(this.map[x+1][y+sgn]==k)arr.push([+1,sgn]);
		if(this.map[x+1][y]==k)arr.push([+1,0]);
		if(this.map[x-1][y]==k)arr.push([-1,0]);
		if(this.map[x][y+1]==k)arr.push([0,+1]);
		if(this.map[x][y-1]==k)arr.push([0,-1]);
	}
	if(k==6||k==-6||k==16||k==-16){
		for(var i=x+1;i<9;i++)if(this.map[i][y]!=0){if(this.map[i][y]==k)arr.push([i-x,0]);break;}
		for(var i=x-1;i>=0;i--)if(this.map[i][y]!=0){if(this.map[i][y]==k)arr.push([i-x,0]);break;}
		for(var i=y+1;i<9;i++)if(this.map[x][i]!=0){if(this.map[x][i]==k)arr.push([0,i-y]);break;}
		for(var i=y-1;i>=0;i--)if(this.map[x][i]!=0){if(this.map[x][i]==k)arr.push([0,i-y]);break;}
		if(k==-16||k==16){
			if(this.map[x+1][y+1]==k)arr.push([+1,+1]);
			if(this.map[x+1][y-1]==k)arr.push([+1,-1]);
			if(this.map[x-1][y+1]==k)arr.push([-1,+1]);
			if(this.map[x-1][y-1]==k)arr.push([-1,-1]);
		}
	}
	if(k==7||k==-7||k==17||k==-17){
		for(var i=1;x+i<9&&y+i<9;i++)if(this.map[x+i][y+i]!=0){if(this.map[x+i][y+i]==k)arr.push([+i,+i]);break;}
		for(var i=1;x+i<9&&y-i>=0;i++)if(this.map[x+i][y-i]!=0){if(this.map[x+i][y-i]==k)arr.push([+i,-i]);break;}
		for(var i=1;x-i>=0&&y+i<9;i++)if(this.map[x-i][y+i]!=0){if(this.map[x-i][y+i]==k)arr.push([-i,+i]);break;}
		for(var i=1;x-i>=0&&y-i>=0;i++)if(this.map[x-i][y-i]!=0){if(this.map[x-i][y-i]==k)arr.push([-i,-i]);break;}
		if(k==-17||k==17){
			if(this.map[x][y+1]==k)arr.push([0,+1]);
			if(this.map[x][y-1]==k)arr.push([0,-1]);
			if(this.map[x+1][y]==k)arr.push([+1,0]);
			if(this.map[x-1][y]==k)arr.push([-1,0]);
		}
	}
	if(k==8||k==-8){
		for(var i=-1;i<=1;i++)for(var j=-1;j<=1;j++){
			if(0<=x+i&&x+i<9&&0<=y+j&&y+j<9&&this.map[x+i][y+j]==k){arr.push([i,j]);break;}
		}
	}
	var mv;
	var size=arr.length;
	if(pxy){
		for(var i=0;i<arr.length;i++)if(pxy[0]==x+arr[i][0]&&pxy[1]==y+arr[i][1])mv=arr[i];
	}else mv=ShogiData.specifyCmd(arr,m,sgn);
	if(!mv)return {player:p,src:{p:p,k:ak},dst:{i:x,j:y,nari:false},koma:ak};
	return {player:p,src:{i:x+mv[0],j:y+mv[1]},dst:{i:x,j:y,nari:n},koma:ak};
}
ShogiData.specifyCmd=function(arr,cmd,sgn){
	if(arr.length==0)return null;
	var xmin,xmax;xmin=xmax=arr[0][0];
	for(var i=0;i<arr.length;i++){
		if(arr[i][0]<xmin)xmin=arr[i][0];
		if(arr[i][0]>xmax)xmax=arr[i][0];
	}
	for(var i=0;i<cmd.length;i++){
		var c=cmd[i];
		if(c=="右")for(var i=0;i<arr.length;){if(arr[i][0]!=(sgn>0?xmin:xmax))arr.splice(i,1);else i++;}
		if(c=="左")for(var i=0;i<arr.length;){if(arr[i][0]!=(sgn>0?xmax:xmin))arr.splice(i,1);else i++;}
		if(c=="上")for(var i=0;i<arr.length;){if(arr[i][1]*sgn<=0)arr.splice(i,1);else i++;}
		if(c=="引")for(var i=0;i<arr.length;){if(arr[i][1]*sgn>=0)arr.splice(i,1);else i++;}
		if(c=="寄")for(var i=0;i<arr.length;){if(arr[i][1]!=0)arr.splice(i,1);else i++;}
		if(c=="直")for(var i=0;i<arr.length;){if(arr[i][1]!=sgn||arr[i][0]!=0)arr.splice(i,1);else i++;}
	}
	return arr[0];
}

ShogiData.komaChar=[null,"歩","香","桂","銀","金","飛","角","玉",null,null,"と","成香","成桂","成銀",null,"竜","馬"];
ShogiData.numberChar1=["１","２","３","４","５","６","７","８","９"]
ShogiData.numberChar2=["一","二","三","四","五","六","七","八","九"];
ShogiData.defaultKoma=[[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0]];
ShogiData.shogiCoordMap={
	"1":0,"2":1,"3":2,"4":3,"5":4,"6":5,"7":6,"8":7,"9":8,
	"１":0,"２":1,"３":2,"４":3,"５":4,"６":5,"７":6,"８":7,"９":8,
	"一":0,"二":1,"三":2,"四":3,"五":4,"六":5,"七":6,"八":7,"九":8
}
ShogiData.komaStringMap={
	1:"歩",2:"香",3:"桂",4:"銀",5:"金",6:"飛",7:"角",8:"玉",
	11:"と",12:"成香",13:"成桂",14:"成銀",16:"竜",17:"馬"
};
ShogiData.komaNumberMap={
	"歩":1,"香":2,"桂":3,"銀":4,"金":5,"飛":6,"角":7,"玉":8,"王":8,
	"と":11,"成香":12,"成桂":13,"成銀":14,"竜":16,"龍":16,"馬":17
};


ShogiData.teaiwariNameMap=["平手","香落ち","右香落ち","飛車落ち","角落ち","飛香落ち","角香落ち","二枚落ち","四枚落ち","六枚落ち","八枚落ち"];
ShogiData.teaiwariNumberMap={};
for(var i=0;i<ShogiData.teaiwariNameMap.length;i++){
	ShogiData.teaiwariNumberMap[ShogiData.teaiwariNameMap[i]]=i;
}

ShogiData.teaiwariMap={
"平手":
	[[-2,0,-1,0,0,0,1,0,2],
	[-3,-7,-1,0,0,0,1,6,3],
	[-4,0,-1,0,0,0,1,0,4],
	[-5,0,-1,0,0,0,1,0,5],
	[-8,0,-1,0,0,0,1,0,8],
	[-5,0,-1,0,0,0,1,0,5],
	[-4,0,-1,0,0,0,1,0,4],
	[-3,-6,-1,0,0,0,1,7,3],
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
	[-2,0,-1,0,0,0,1,0,2]],
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
"八枚落ち":
	[[0,0,-1,0,0,0,1,0,2],
	[0,0,-1,0,0,0,1,6,3],
	[0,0,-1,0,0,0,1,0,4],
	[-5,0,-1,0,0,0,1,0,5],
	[-8,0,-1,0,0,0,1,0,8],
	[-5,0,-1,0,0,0,1,0,5],
	[0,0,-1,0,0,0,1,0,4],
	[0,0,-1,0,0,0,1,7,3],
	[0,0,-1,0,0,0,1,0,2]]
}


