async function loadFriendLinks() {
    try {
        const response = await fetch('/data/friends.json'); // Update with the correct path to your JS file
        const data = await response.json();
        const groups = data.groups;

        // render
        var tagsGroupHtml = "";
        var friendGroupHtml = "";
        var odd = true;
        groups.forEach(group => {
            if (group.display_name) {
                friendGroupHtml += `<h2><a class="headerlink" href="#${group.display_name}-${group.links.length}" title="${group.display_name}(${group.links.length})"></a>${group.display_name} (${group.links.length})</h2>`;
            }
            if (group.description) {
                friendGroupHtml += `<div class="flink-desc">${group.description}</div>`;
            }
            friendGroupHtml += '<div class="site-card-group">';

            group.links.forEach(link => {
                if (odd) {
                    tagsGroupHtml += '<div class="tags-group-icon-pair">';
                }
                var img = link.local_logo || link.logo;
                tagsGroupHtml += `
                    <a class="tags-group-icon" target="_blank" href="${link.url}" title="${link.display_name}">
                        <img title="${link.display_name}" src="${img}" loading="lazy">
                    </a>
                `;
                friendGroupHtml += `
                    <div class="site-card">
                        ${link.label ? `<span style="background-color:${link.label_color}" class="site-card-tag">${link.label}</span>` : ''}
                        <a class="img" target="_blank" href="${link.url}" title="${link.display_name}" rel="external nofollow noopener">
                            <img class="flink-avatar" style="pointer-events: none;" alt="${link.display_name}" src="${img}" loading="lazy">
                        </a>
                        <a class="info cf-friends-link" target="_blank" href="${link.url}" title="${link.display_name}" rel="external nofollow noopener">
                            <div class="site-card-avatar no-lightbox">
                                <img class="flink-avatar cf-friends-avatar" alt="${link.display_name}" src="${img}" loading="lazy">
                            </div>
                            <div class="site-card-text">
                                <span class="title cf-friends-name">${link.display_name}</span>
                                <span class="desc" title="${link.description}">${link.description}</span>
                            </div>
                        </a>
                    </div>
                `;

                if (!odd) {
                    tagsGroupHtml += '</div>';
                }
                odd = !odd;
            });
            friendGroupHtml += '</div>';
        });
        if (!odd) {
            tagsGroupHtml += '</div>';
        }
        const tagsGroupWrapper = document.getElementById('tags-group-wrapper');
        tagsGroupWrapper.innerHTML = tagsGroupHtml;
        const friendGroups = document.getElementById('friend-groups');
        friendGroups.innerHTML = friendGroupHtml;
    } catch (error) {
        console.error('Error loading friend links:', error);
    }
}

loadFriendLinks()