if(GLOBAL_CONFIG.htmlType!='comments' && document.querySelector('#post-comment')) {

    var commentBarrageConfig = {
        //同时最多显示弹幕数
        maxBarrage: GLOBAL_CONFIG.source.comments.maxBarrage,
        //弹幕显示间隔时间ms
        barrageTime: GLOBAL_CONFIG.source.comments.barrageTime,
        serverUrl: "",
        mailMd5: GLOBAL_CONFIG.source.comments.mailMd5,
        pageUrl: window.location.pathname.replace(/\/page\/\d$/, ""),
        barrageTimer: [],
        barrageList: [],
        barrageIndex: 0,
        dom: document.querySelector('.comment-barrage'),
        use: GLOBAL_CONFIG.source.comments.use
    }
    switch (commentBarrageConfig.use) {
        case 'twikoo':
            //twikoo部署地址腾讯云的为环境ID
            commentBarrageConfig.serverUrl = GLOBAL_CONFIG.source.twikoo.twikooUrl;
            //token获取见上方
            commentBarrageConfig.accessToken= GLOBAL_CONFIG.source.twikoo.accessToken;
            break;
        case 'artalk':
            commentBarrageConfig.serverUrl = GLOBAL_CONFIG.source.artalk.artalkUrl;
            commentBarrageConfig.siteName = GLOBAL_CONFIG.source.artalk.siteName;
            break;
        case 'waline':
            commentBarrageConfig.serverUrl = GLOBAL_CONFIG.source.waline.serverURL;
            break;    
        default:
            break;
    }
    var commentInterval = null;
    var hoverOnCommentBarrage = false;

    $(".comment-barrage").hover(function () {
        hoverOnCommentBarrage = true;
        //console.log("热评悬浮");
    }, function () {
        hoverOnCommentBarrage = false;
        //console.log("停止悬浮");
    });

    function initCommentBarrage() {
        //console.log("开始创建热评")

        if(commentBarrageConfig.use=='twikoo'){
            var data = JSON.stringify({
                "event": "COMMENT_GET",
                "commentBarrageConfig.accessToken": commentBarrageConfig.accessToken,
                "url": commentBarrageConfig.pageUrl
            });
            var xhr = new XMLHttpRequest();
            xhr.withCredentials = true;
            xhr.addEventListener("readystatechange", function () {
                if (this.readyState === 4) {
                    commentBarrageConfig.barrageList = commentLinkFilter(JSON.parse(this.responseText).data);
                    commentBarrageConfig.dom.innerHTML = '';
                }
            });
            xhr.open("POST", commentBarrageConfig.serverUrl);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(data);
        }

        if(commentBarrageConfig.use=='artalk'){
            var data ={
                "site_name": commentBarrageConfig.siteName,
                "page_key": commentBarrageConfig.pageUrl,
                "limit": 100,
                "offset": 0
            };
            var xhr = new XMLHttpRequest();
            xhr.withCredentials = true;
            xhr.addEventListener("readystatechange", function () {
                if (this.readyState === 4) {
                    commentBarrageConfig.barrageList = commentLinkFilter(JSON.parse(this.responseText).data.comments);
                    commentBarrageConfig.dom.innerHTML = '';
                }
            });
            const usp = new URLSearchParams(data)
            const query = usp.toString()
            xhr.open("POST", commentBarrageConfig.serverUrl+'api/get');
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhr.send(query);
        }

        if(commentBarrageConfig.use=='waline'){
            fetch( commentBarrageConfig.serverUrl+`/comment?path=${commentBarrageConfig.pageUrl}&pageSize=100&page=1&lang=zh-CN&sortBy=insertedAt_desc`)
                .then((e=>e.json())).then((({data: t})=>{
                    if(t.length>0){
                        commentBarrageConfig.barrageList = commentLinkFilter(t);
                        commentBarrageConfig.dom.innerHTML = '';
                    }
                }
            ))
        }

        clearInterval(commentInterval);
        commentInterval = null;

        commentInterval = setInterval(() => {
            if (commentBarrageConfig.barrageList.length && !hoverOnCommentBarrage) {
                popCommentBarrage(commentBarrageConfig.barrageList[commentBarrageConfig.barrageIndex]);
                commentBarrageConfig.barrageIndex += 1;
                commentBarrageConfig.barrageIndex %= commentBarrageConfig.barrageList.length;
            }
            if ((commentBarrageConfig.barrageTimer.length > (commentBarrageConfig.barrageList.length > commentBarrageConfig.maxBarrage ? commentBarrageConfig.maxBarrage : commentBarrageConfig.barrageList.length)) && !hoverOnCommentBarrage) {
                removeCommentBarrage(commentBarrageConfig.barrageTimer.shift())
            }
        }, commentBarrageConfig.barrageTime)
    }

    function commentLinkFilter(data) {
        let newData = [];
        if(commentBarrageConfig.use=='Twikoo'){
            data.sort((a, b) => {
                return a.created - b.created;
            })
            data.forEach(item => {
                newData.push(...getCommentReplies(item));
            });
        }
        if(commentBarrageConfig.use=='Artalk'){
            data.sort((a, b) => {
                const aCreated = Date.parse(a.date);
                const bCreated = Date.parse(b.date);
                return aCreated - bCreated;
            })
            data.forEach(item => {
                newData.push(item);
            });
        }
        if(commentBarrageConfig.use=='Waline'){
            data.sort((a, b) => {
                return a.time - b.time;
            })
            data.forEach(item => {
                newData.push(...getCommentWalineReplies(item));
            });
        }
        return newData;
    }

    function getCommentReplies(item) {
        if (item.replies) {
            let replies = [item];
            item.replies.forEach(item => {
                replies.push(...getCommentReplies(item));
            })
            return replies;
        } else {
            return [];
        }
    }
    function getCommentWalineReplies(item) {
        if (item.children) {
            let children = [item];
            item.children.forEach(item => {
                children.push(...getCommentReplies(item));
            })
            return children;
        } else {
            return [];
        }
    }

    function popCommentBarrage(data) {
        let isTwikoo = commentBarrageConfig.use=='Twikoo'
        let isArtalk = commentBarrageConfig.use=='Artalk';
        let isWaline = commentBarrageConfig.use=='Waline';
        let nick = data.nick;
        let avatar = isTwikoo ? `https://cravatar.cn/avatar/${data.mailMd5}` :
            isArtalk ?  `https://cravatar.cn/avatar/${data.email_encrypted}?d=mp&s=240` :
                isWaline ? data.avatar :'https://cravatar.cn/avatar/';
        let barrageBlogger = isTwikoo ? data.mailMd5 === commentBarrageConfig.mailMd5 :
            isArtalk ? data.email_encrypted === commentBarrageConfig.mailMd5 :
                isWaline ?  data.type === 'administrator' :false;
        let id = isTwikoo ?  data.id :
            isArtalk ?  'atk-comment-'+data.id  :
                isWaline ? data.objectId : 'post-comment';
        let comment = isTwikoo ? data.comment :
            isArtalk ? data.content :
                isWaline ? data.comment : '';
        let badge_name = isArtalk ? data.badge_name : '博主'
        let badgeName = !barrageBlogger ? "热评" : badge_name != '' ? badge_name : "博主"
        let barrage = document.createElement('div');
        let width = commentBarrageConfig.dom.clientWidth;
        let height = commentBarrageConfig.dom.clientHeight;
        barrage.className = 'comment-barrage-item'
        barrage.innerHTML = `
        <div class="barrageHead">
        <a class="barrageTitle
        ${barrageBlogger ? "barrageBloggerTitle" : ""}" href="javascript:wjx.scrollTo('post-comment')">
        ${badgeName}
        </a>
        <div class="barrageNick">${nick}</div>
        <img class="barrageAvatar" src="${avatar}" loading="lazy"/>
        <a class="comment-barrage-close" href="javascript:wjx.switchCommentBarrage()"><i class="icon-xmark"></i></a>
        </div>
        <a class="barrageContent" href="javascript:wjx.scrollTo('${id}');">${comment}</a>
        `
        // 获取barrage标签内的所有pre元素
        let Pres = barrage.querySelectorAll(".barrageContent pre");

        // 遍历每个pre元素，将其替换为"【代码】"
        Pres.forEach((pre) => {
            let codePlaceholder = document.createElement("span");
            codePlaceholder.innerText = "【代码】";
            pre.parentNode.replaceChild(codePlaceholder, pre);
        });

        // 获取标签内的所有图片元素
        let Images = barrage.querySelectorAll(".barrageContent img");

        // 遍历每个图片元素，将其替换为"【图片】"，但排除带有class=tk-owo-emotion的图片
        Images.forEach((image) => {
            if (!image.classList.contains("tk-owo-emotion")) {
                image.style.display = "none"; // 隐藏图片
                let placeholder = document.createElement("span");
                placeholder.innerText = "【图片】";
                image.parentNode.replaceChild(placeholder, image);
            }
        });
        commentBarrageConfig.barrageTimer.push(barrage);
        commentBarrageConfig.dom.append(barrage);
    }

    function removeCommentBarrage(barrage) {
        barrage.className = 'comment-barrage-item out';
        setTimeout(() => {
            commentBarrageConfig.dom.removeChild(barrage);
        }, 1000)
    }

    initCommentBarrage();

    if (localStorage.getItem('commentBarrageSwitch') !== 'false') {
        $(".comment-barrage").show();
        $(".menu-commentBarrage-text").text("关闭热评");
        document.querySelector("#consoleCommentBarrage").classList.add("on");

    } else {
        $(".comment-barrage").hide();
        $(".menu-commentBarrage-text").text("显示热评");
        document.querySelector("#consoleCommentBarrage").classList.remove("on");


    }


    document.addEventListener('pjax:send', function () {
        clearInterval(commentInterval);
    });
}