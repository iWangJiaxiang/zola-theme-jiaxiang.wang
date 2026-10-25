function runPostAbstract() {

    // 获取挂载元素，即文章内容所在的容器元素
    let targetElement = document.querySelector('#post #article-container');
    // 若el配置不存在则自动获取，如果auto_mount配置为真也自动获取
    if (!targetElement) {
        return;
    };

    let abstract =  document.getElementById('abstract-content').innerText;

    // 当前随机到的ai摘要到index
    let lastAiRandomIndex = -1;
    let animationRunning = true; // 标志变量，控制动画函数的运行
    const explanation = document.querySelector("#abstract-content");
    const post_ai = document.querySelector("#abstract-content");
    let ai_str = "";
    let ai_str_length = "";
    let delay_init = 600;
    let i = 0;
    let j = 0;
    let sto = [];
    let elapsed = 0;
    const animate = timestamp => {
        if (!animationRunning) {
            return; // 动画函数停止运行
        }
        if (!animate.start) animate.start = timestamp;
        elapsed = timestamp - animate.start;
        if (elapsed >= 20) {
            animate.start = timestamp;
            if (i < ai_str_length - 1) {
                let char = ai_str.charAt(i + 1);
                let delay = /[,.，。!?！？]/.test(char) ? 150 : 20;
                if (explanation.firstElementChild) {
                    explanation.removeChild(explanation.firstElementChild);
                }
                explanation.innerHTML += char;
                let div = document.createElement("div");
                div.className = "ai-cursor";
                explanation.appendChild(div);
                i++;
                if (delay === 150) {
                    document.querySelector("#abstract-content .ai-cursor").style.opacity = "0";
                }
                if (i === ai_str_length - 1) {
                    observer.disconnect(); // 暂停监听
                    explanation.removeChild(explanation.firstElementChild);
                }
                sto[0] = setTimeout(() => {
                    requestAnimationFrame(animate);
                }, delay);
            }
        } else {
            requestAnimationFrame(animate);
        }
    };
    const observer = new IntersectionObserver(
        entries => {
            let isVisible = entries[0].isIntersecting;
            animationRunning = isVisible; // 标志变量更新
            if (animationRunning) {
                delay_init = i === 0 ? 200 : 20;
                sto[1] = setTimeout(() => {
                    if (j) {
                        i = 0;
                        j = 0;
                    }
                    if (i === 0) {
                        explanation.innerHTML = ai_str.charAt(0);
                    }
                    requestAnimationFrame(animate);
                }, delay_init);
            }
        },
        { threshold: 0 }
    );
    function clearSTO() {
        if (sto.length) {
            sto.forEach(item => {
                if (item) {
                    clearTimeout(item);
                }
            });
        }
    }
    function startAI(str, df = true) {
        i = 0; //重置计数器
        j = 1;
        clearSTO();
        animationRunning = false;
        elapsed = 0;
        observer.disconnect(); // 暂停上一次监听
        explanation.innerHTML = df ? "生成中. . ." : "请等待. . .";
        ai_str = str;
        ai_str_length = ai_str.length;
        observer.observe(post_ai); //启动新监听
    }

    async function genAbstract() {
        i = 0; //重置计数器
        j = 1;
        clearSTO();
        animationRunning = false;
        elapsed = 0;
        observer.disconnect(); // 暂停上一次监听

        const strArr = abstract.split(",").map(item => item.trim()); // 将字符串转换为数组，去除每个字符串前后的空格
        if (strArr.length !== 1) {
            let randomIndex = Math.floor(Math.random() * strArr.length); // 随机生成一个索引
            while (randomIndex === lastAiRandomIndex) { // 如果随机到了上次的索引
                randomIndex = Math.floor(Math.random() * strArr.length); // 再次随机
            }
            lastAiRandomIndex = randomIndex; // 更新上次随机到的索引
            startAI(strArr[randomIndex]);
        } else {
            startAI(strArr[0])
        }
    }

    function recommendList() {
        let thumbnail = document.querySelectorAll('.relatedPosts-list a');
        var title = document.title;
        let list = '';
        let index = 0;
        if (!thumbnail.length) {
            const cardRecentPost = document.querySelector('.card-widget.card-recent-post');
            if (!cardRecentPost) return '';

            thumbnail = cardRecentPost.querySelectorAll('.aside-list-item a');

            if(thumbnail.length>0){
                thumbnail.forEach(item => {
                    if (item) {
                        if(!title.includes(item.title)){
                            index +=1;
                            list += `<div class="ai-recommend-item"><span class="index">${i + 1}：</span><a href="javascript:;" onclick="pjax.loadUrl('${item.href}')" title="${item.title}">${item.title}</a></div>`;
                        }
                    }
                });
            }
            return `很抱歉，无法找到类似的文章，你也可以看看本站最新发布的文章：<br /><div class="ai-recommend">${list}</div>`;
        }
        thumbnail.forEach(item => {
            if (item) {
                if(!title.includes(item.title)){
                    index +=1;
                    list += `<div class="ai-recommend-item"><span>推荐${index}：</span><a href="javascript:;" onclick="pjax.loadUrl('${item.href}')" title="${item.title}">${item.title}</a></div>`;
                }
            }
        });
        return `推荐文章:<br /><div class="ai-recommend">${list}</div>`;
    }

    function intro() {
        startAI("我是文章摘要助手，是一个基于文章元数据的摘要生成器，在不久的将来我会进化为基于大模型的版本哟~ 点击下方的按钮，让我为你生成本文简介、推荐相关文章吧~")
    }

    // 监听tip点击事件
    document.getElementById("abstract-tag").addEventListener("click", () => {
        intro();
    });
    document.getElementById("abstract-intro").addEventListener("click", () => {
        intro();
    });
    document.getElementById("abstract-generate").addEventListener("click", () => {
        genAbstract();
    });
    document.getElementById("abstract-recommend").addEventListener("click", () => {
        i = 0; //重置计数器
        j = 1;
        clearSTO();
        animationRunning = false;
        elapsed = 0;
        explanation.innerHTML = "生成中. . .";
        ai_str = "";
        ai_str_length = "";
        observer.disconnect(); // 暂停上一次监听
        sto[2] = setTimeout(() => {
            explanation.innerHTML = recommendList();
        }, 600);
    });
    document.getElementById("abstract-home").addEventListener("click", () => {
        startAI("正在前往主页...", false);
        sto[2] = setTimeout(() => {
            pjax.loadUrl("/");
        }, 1000);
    });
    document.getElementById("abstract-hide").addEventListener("click", () => {
        document.getElementById("abstract-container").style.display = 'none';
    });

    genAbstract();
}