import Container from '@zeecoder/container-query/Container';

function initialiseContainer (jsonData) {
    let htmlElements = document.querySelectorAll(jsonData.selector);
    htmlElements.forEach((htmlElement) => {
        const containerInstance = new Container(htmlElement, jsonData);
        window.addEventListener('resize', containerInstance.adjust);
    });
}

initialiseContainer(require('../css/components/user/user.json'));
initialiseContainer(require('../css/components/social-link/social-link.json'));


// import initialiseAllContainers from '../initialiseAllContainers';

// const containers = require('./containers.css.json');

// initialiseAllContainers(containers);
