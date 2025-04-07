// swiper js

const swiper5 = new Swiper('.steps__swiper', {
    spaceBetween: 30,
    breakpoints: {
      1024: {
        slidesPerView: 3.5,
        spaceBetweenSlides: 20,
      },
      720: {
        slidesPerView: 2.5,
      },
      550: {
        slidesPerView: 1.8,
      },
    },
    navigation: {
      nextEl: '.swiper-button-next5',
      prevEl: '.swiper-button-prev5',
    }
  });
  const swiper2 = new Swiper('.benefit__right-cnt', {
    breakpoints: {
  
      676: {
        slidesPerView: 2,
        grid: {
          rows: 2,
        },
      },
      320: {
        slidesPerView: 1,
        grid: {
          rows: 2,
        },
      },
    },
  
    spaceBetween: 24,
    navigation: {
      nextEl: '.swiper-button-next2',
      prevEl: '.swiper-button-prev2',
    }
  });
  const swiper3 = new Swiper('.team-right__swiper', {
    // slidesPerView: 3,
    spaceBetween: 30,
    breakpoints: {
      720: {
        slidesPerView: 3,
      },
      320: {
        slidesPerView: 2,
      },
    },
    navigation: {
      nextEl: '.swiper-button-next3',
      prevEl: '.swiper-button-prev3',
    }
  });
  // const swiper3 = new Swiper('.team-right__swiper', {
  //   // slidesPerView: 3,
  //   spaceBetween: 30,
  //   breakpoints: {
  //     720: {
  //       slidesPerView: 3,
  //     },
  //     320: {
  //       slidesPerView: 2,
  //     },
  //   },
  //   navigation: {
  //     nextEl: '.swiper-button-next3',
  //     prevEl: '.swiper-button-prev3',
  //   }
  // });