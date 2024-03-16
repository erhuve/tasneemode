var amtPerSec = 3075.64;

var margin = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

var radians = 0.0174532925;

var r = 120;

var secR = r + 16;
var hourR = r - 40;

var hourHandLength = (2 * r) / 3;
var minuteHandLength = r;
var secondHandLength = r - 12;

var w = d3.select("figure").node().clientWidth - margin.left - margin.right;
var h = d3.select("figure").node().clientHeight - margin.top - margin.bottom;

var minuteScale = (secondScale = d3.scale
  .linear()
  .range([0, 354])
  .domain([0, 59]));

var hourScale = d3.scale.linear().range([0, 330]).domain([0, 11]);

var drag = d3.behavior
  .drag()
  .on("dragstart", dragstart)
  .on("drag", drag)
  .on("dragend", dragend);

var handData = [
  {
    type: "hour",
    value: 0,
    length: hourHandLength,
    scale: hourScale,
  },
  //   {
  //     type: "minute",
  //     value: 0,
  //     length: -minuteHandLength,
  //     scale: minuteScale,
  //   },
  //   {
  //     type: "second",
  //     value: 0,
  //     length: -secondHandLength,
  //     scale: secondScale,
  //   },
];

function updateData() {
  var t = new Date();
  handData[0].value = (t.getHours() % 12) + t.getMinutes() / 60;
  //   handData[1].value = t.getMinutes();
  //   handData[2].value = t.getSeconds();
}

updateData();

var svg = d3
  .select("svg")
  .attr("width", w + margin.left + margin.right)
  .attr("height", h + margin.top + margin.bottom);

var g = svg
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var face = g.append("g").attr("transform", "translate(" + r + "," + r + ")");

face.append("circle").attr({
  class: "outline",
  r: r,
  cx: 0,
  cy: 0,
  fill: "#f88639",
});

// face
//   .selectAll(".second")
//   .data(d3.range(0, 60))
//   .enter()
//   .append("line")
//   .attr({
//     class: "second",
//     x1: 0,
//     x2: 0,
//     y1: r,
//     y2: r - 10,
//     transform: function (d) {
//       return "rotate(" + minuteScale(d) + ")";
//     },
//   });

// face
//   .selectAll(".second-label")
//   .data(d3.range(5, 61, 5))
//   .enter()
//   .append("text")
//   .classed(".second-label", true)
//   .text(function (d) {
//     return d;
//   })
//   .attr({
//     "text-anchor": "middle",
//     x: function (d) {
//       return secR * Math.sin(secondScale(d) * radians);
//     },
//     y: function (d) {
//       return -secR * Math.cos(secondScale(d) * radians) + 8;
//     },
//     fill: "white",
//   });

face
  .selectAll(".hour")
  .data(d3.range(0, 12))
  .enter()
  .append("line")
  .attr({
    class: "hour",
    x1: 0,
    x2: 0,
    y1: r,
    y2: r - 20,
    transform: function (d) {
      return "rotate(" + hourScale(d) + ")";
    },
  });

face
  .selectAll(".hour-label")
  .data(d3.range(1, 13))
  .enter()
  .append("text")
  .text(function (d) {
    return d;
  })
  .attr({
    class: "hour-label",
    "text-anchor": "middle",
    x: function (d) {
      return hourR * Math.sin(hourScale(d) * radians);
    },
    y: function (d) {
      return -hourR * Math.cos(hourScale(d) * radians) + 9;
    },
    fill: "white",
    "font-size": 20,
  });

var hands = face.append("g");

hands
  .selectAll("line")
  .data(handData)
  .enter()
  .append("line")
  .attr({
    class: function (d) {
      return d.type + "-hand";
    },
    x1: 0,
    y1: 0,
    x2: function (d) {
      console.log(d, d.length);
      return d.length * Math.cos(Math.PI / 3);
    },
    y2: function (d) {
      return d.length * Math.sin(-Math.PI / 3);
    },
  })
  .call(drag);

// small circle in middle to cover hands
face.append("circle").attr({
  cx: 0,
  cy: 0,
  r: 15,
  fill: "white",
  stroke: "#374140",
  "stroke-width": 3,
});

var months = {
  1: `On March 17th, 2023, I answered a math question from a pretty girl. A math question turned to geography, and literature, and music, and overall a really pleasant time. The vibes were immaculate and you were fun and easy to talk to, we bounced off each other well. I had plans that day I needed to attend, I said I had to go but I’d be back. I guess usually that means never talking again in the dating app world, but I meant it that I’d be back, I wanted to be back and keep talking with you and start to learn more about you. 
	<br><br>
	“What brings you to Hinge?” I asked. You were just messing around, I wasn’t really looking for anything either. From our conversation though I had an inkling of a feeling, that maybe I had just found something. A premonition, maybe. That Japanese phrase, “koi no yokan.” There’s no BS here, I felt that there might be something, that we might go somewhere. At the same time, I guess you could say I was trying to have commitment issues? I had been stupid and thoughtless before and I had let myself get hurt before, and I tried to stay steadfast that I wasn’t looking for anything right now. But I had a feeling that I at least might develop feelings.
	<br><br>
	We talked more and more, soon we were talking every day. Raccoon memes, talks of throwing me into a dumpster, favorite colors, favorite flowers, spotify, random stuff. It was fun and it was easy and it was nice. One day I get on a call with you to make you do your homework. I refused to turn my camera on because I was embarrassed by my messy room where I had to sit on the floor. I was also rightfully embarrassed by my living situation in general so I had tried to get ahead of it with humor, “you wanna know some tea!!” Cover up the pain. Anyways, we called again the next day and ended up having an 8 hour call including 100 buzzfeed quizzes where we found that we were actually quite alike, at least according to buzzfeed.`,
  2: `On April 6th, 2023, you called me babe. We went back and forth calling each other babe before you mentioned you hate the word. I asked what you liked, and we both shared the pet names we liked with each other, and I started using them.
  <br><br>
  On April 9th, 2023, I told you I love carrot cake, and that “I like you kinda I think but it’s hard to tell what you feel.”
  <br><br>
  On April 13th, 2023, we met in person for the first time, at Adelphi. 
  <br><br>
  You couldn’t even look at me, but I can’t really blame you for that– I could’ve been a serial killer for all you know. I had never even shown up on video or sent pictures before now, I probably seemed insane to have even said I might like you before we had ever met. I guess the premonition was strong. Also, I had that ugly, crispy hair. At the time, I thought, is this what it’s gonna be like? Will she be able to look at me? It was certainly an unconventional first meeting, but in the end, the avoidance of eye contact didn’t really matter.
  <br><br>
  I had told you before that I’d buy you a tuna sandwich, and we went out to do so, but on the way you stopped to make sure to get me coffee and a cookie too. You were always kind and generous. It was pretty fun to hang out in person, and the day took an especially interesting turn with a certain someone’s appearance.
  <br><br>
  I had fun. I asked you later how you felt about the day, and you said you wouldn’t mind doing it again. I said, me too.
  `,
  3: `On May 4th, 2023, we had a little spat. I got upset at you making fun of my outfit for the K-pop showcase I danced in that day. I went to bed upset and didn’t send you my wordle score as I had done every day before. The next day, we made up and you apologized, and you had noticed that I must’ve been pretty angry to not send you my wordle score. But, we did make up and all was well. I really appreciated it.
	<br><br>
  On May 11th, 2023, we met in person again. Just like when we first met in April, it was the second Thursday of the month. For you, it was the day after the TXT concert. This time, we were able to eat our sandwiches at school. We messed around playing would you rather and never have i ever. I wore an atrocious outfit and apparently said possessiveness was annoying and that Adelphi was kind of boring?? My head was not working right that day to say the least. This time and the last, you asked me a lot more questions like about religion or about my "tea" I had "spilled" before, or just random stuff. You've always been curious and genuinely interested in people and things.
  <br><br>
  On May 15th, 2023, I hit a low moment. In my stress came out the 3-day incident. Even then I was never gonna disappear on you. I know it wasn’t apparent and I didn’t communicate it well at all, but I was trying with the energy I had to show that I still wanted to talk and be your friend–  with my limited energy I wanted to wait until I had more of it, and uninterrupted time to have a conversation that I thought might require that. I sent wordle scores to show that I wasn’t so mad or upset that I wouldn’t even send wordle scores, based off what you recognized the last time. Pretty stupid, I know. I genuinely thought you didn’t want to talk to me either, I thought you would be messaging me your thoughts first otherwise, and I thought I probably wasn’t worth it anyways. But I meant it when I said we could talk about it when I had more time, because I wanted to give you the proper time and attention and energy for that, and I wanted to talk with you, and I wanted you to be in my life. None of this is justification, but it’s all to say that even back then I was never going to disappear. I always wanted you in my life.
  <br><br>
  On May 26th, 2023, we went to the Met as friends, then to Prince Tea House in the East Village, and enjoyed free Insomnia Cookies. We sat on a bench outside St. Mark’s Church, enjoying our cookies and each other’s company, playing would you rather and commenting on funny pigeons. You leaned on me and adjusted your position, and I asked if you were comfortable. You said sorry, but I wasn’t asking sarcastically. It was comfortable.
  `,
  4: `On June 4th, 2023, you read me a bedtime story.
  <br><br>
  On June 10th, 2023, I read you a bedtime story. We were still talking every day, and our sleep schedules were perfect for reading each other to sleep. We both started feeling something. That wasn’t very “just friends” of us. There was no denying I liked you even more now, though I tried hard to. Or maybe underneath it all I subconsciously wasn’t trying hard to deny it. I asked if you wanted to see Spiderverse when I came back. I had told myself that the bedtime stories would end when I left Korea. The stories did not end.
  <br><br>
  On June 21st, 2023, we watched Spiderverse at the Multiplex. We had the whole theatre to ourselves, but even though we both liked each other, we were supposed to be just friends. We wanted to bump hands in the popcorn bucket, but it never happened. The empty theatre still gave us the chance to talk loudly with each other during the movie, and we had a great time. We went to King Rufus Park and McDonald’s and watched TikToks and talked more. You showed me one on a bench in the park and I leaned in close to your shoulder. I wanted to lean even closer.
  <br><br>
  On June 22nd, 2023, we watched Les Mis on Teleparty. Your friends were mad that you were watching another movie with me when they had been wanting to watch something with you for a week. I felt bad about taking your time from them, but I was also happy that you were spending time with me. In one of the songs in the movie, there was the line, “I did not live until today.” And I found that I did not live until I met you. Who was I, where was I before, a mere shell just getting into crap. But I met you and I came alive. I lived. 
  <br><br>
  In you I saw a person I could trust. A person who was thoughtful, kind, and generous. A person who was smart, clever, witty. A person who was funny, fun, exciting. A person who was talented, skilled, and impressive. Someone of pure heart. Of good brains. Of divine soul.
  `,
  5: `On July 10th, 2023, I went to K-town to meet you after you got off work. Unbeknownst to me, I would not be the only one coming to see you. My intentions for arranging the day were to have alone time with you, because I really liked being with you, I really liked you. I didn’t mind, though. Maybe this would keep me in check, even, since I wasn’t really supposed to like you. It was really pleasant, though, and in the end I did even get to spend time alone with you. That’s when we sat on another park bench, this time in Union Square, exploring more crazy would you rather scenarios and chatting, taking in the music and air of the park. A butterfly landed on me, and then it landed on you. I wanted to say something. I didn’t. When I walked you to the train station, you dropped your phone. When you bent down to pick it up, I asked if you were okay, and you held out your hand and said you’re fine. 
  I wanted to hold your hand. I did. And for the second that I did, I was really happy, and I felt butterflies, and it felt good, and it felt right.
  <br><br>
  I don’t know the exact day I deleted Hinge, but it was gone. When I deleted it, it was because I knew I couldn’t fight myself that I had fallen for you. And I knew even if I couldn’t be with you, I couldn’t be with anyone else either. 
  <br><br>
  On July 19th, 2023, you said it was funny how we went from friends to married and divorced, that it felt like we were missing some chapters. On July 19th, 2023, I asked if you wanted to fill in some of those chapters. On July 19th, 2023, you said you would not be against reading that chapter. On July 19th, 2023, the world evolved. You were, and are my world.
  `,
  6: `On August 6th, 2023, I told you I love you. Technically, it was August 7th, 2023, I guess. I had been battling myself about this– after all, it was pretty soon after we even started dating. But then again, we had known each other for months prior to that, too. I knew that I was always thinking about you, and I was always thinking of the best for you. I saw in you a true partner that I could appreciate journeying through life with. For three weeks into the relationship, I was pretty spot-on with that assessment. I loved you. I love you.
  <br><br>
  On August 19th, 2023, we had our first anniversary. You showed me Smosh Reddit stories on a park bench in Flushing, and you nearly fell asleep while we watched. I gave you a couple letters as well, which you read away from me because I was embarrassed. There was a part I had crossed out, and you asked if I had actually written something there or if it was for comedic effect. What I wrote was something to the effect of, I’ll try to be perfect for you, but I won’t be, I can’t be perfect. What I can be, is there for you. I will always be there for you and I will always be my best for you. This I promise.
  <br><br>
  I guess I felt like a loser if I wrote that after just a month of dating and having not really fudged anything up, I guess I had no idea. And I guess I should’ve just kept it. It’s been true the whole time even if I didn’t tell you. By the way, I love you.
  `,
  7: `On September 17th, 2023, I wrote an essay about you. Its words still ring true to this day. Read it again here.
  <br><br>
  <iframe src="Report.pdf" width="500" height="500"></iframe> 
  <br><br>
  On September 24th, 2023, you asked me if I loved pageants. It was the second time you asked me this, so I asked if you do, and you said maybe. I said maybe I do too. You also said you consent, referring to kissing.
  <br><br>
  On September 25th, 2023, I told you I love you again. On September 25th, 2023, you kissed me. I still swear though that I was going to do it, you just got to it before I could. Your car broke down and things got pretty stressful. When I was stressing the next day and panicking and spiraling, we resolved things, and you told me about having faith in you and having faith in myself too. You said you’re not perfect but that you’re here to listen and talk things out no matter the circumstances, that you try not to let emotions cloud you or make you gloss over things. And that I make mistakes and it’s fine, that I didn’t intend to hurt anyone. You often remind me that I’m human, that I’m young, that I’m allowed to make mistakes. I hope you always remember this for yourself too, as you’ve reminded me.
  `,
  8: `On October 3rd, 2023, you brought your blonde wig and eyeliner for me to try on, and that was… something. It was fun, and it was safe. You encouraged me and pushed me to try things I was interested in. As another example,
  <br><br>
  On October 12th, 2023, you picked me up from Jamaica Center and drove to Adelphi with me for the first time, and later that day you pushed me to perform Devil by the Window and Crown choreo in the music room. That was probably the best dancing I ever did and I was laughing and smiling and having a good time, and you encouraged me and brought it out of me.
  <br><br>
  On October 15th, 2023, we went to the carnival together and nearly threw up. We watched some of the After movies in the music room after, and you looked through my photo gallery. Somehow even after that, you were still attracted to me. That gallery has since gone through multiple iterations of cleaning out.
  <br><br>
  On October 28th, 2023, I met you at Dollar Tree for the first time after getting a haircut in Flushing. It was really nice, just accompanying you to run an errand and enjoying each other’s company in a simple and mundane task of life. It was so, so nice. Just being with you is nice, and to partake in slices of life like that feel peaceful, serene, comfortable, warm. We went to the Multiplex after and played around. We accidentally matched outfits that day, too. We took pictures in the photobooth since it was finally working now. I apologized that I hadn’t shaved that day, and you said it doesn’t matter and pulled me back in.
  `,
  9: `On November 11th, 2023, we revisited the Met and K-town as a couple. We took really cute pictures and almost lost your phone in the Line Friends store, and we enjoyed some delicious food. We had a blast recording multiple vinyl records, and I loved listening to you sing even though you insist it was bad. We accidentally played a recording of you saying you don’t like me in the Build-A-Bear store. We got the crappy bottled butterbeer. We walked around and sat on a bench outside. We ate Pepero for the occasion. You said it was such a good day, you were scared. But that’s what it was, a good day. And we’ll go on to have more good days. Loreless days. Many more.
  <br><br>
  On November 19th, 2023, we went ice skating with my friends at Bryant Park. I was nervous since I didn’t really know how that works and I’m kind of a mess. You pushed me to try skating by myself and in the center, and I like kind of did it. You took time while instilling bravery in me to also talk to my friends. We scammed Rahul out of some money also, and got some pictures at the library for your cultural event, and ate at K-town, where you unwillingly learned what a “yuppie” was. After they left, we spent more time together and got our nails done at the Samsung store, found out how expensive the Empire State Building was, and explored the Macy’s and checked out the more private spots there.
  <br><br>
  On November 27th 2023, it was your birthday. One of my gifts for you was <a href=instax.html target="_blank" style="color:blue">this page on your website</a>. Please look at it again for some more visual memories. In the last picture, you can see the bubble gun I also got you. Seeing your pure joy at it made me just as happy. You’re absolutely adorable and nothing makes me happier.`,
  10: `On December 15th, 2023, we opened up to each other about things in our past. You know things of me that no one else does. And I feel safe and secure that the parts of me I’ve kept secret are safe in your hands. I trust you and love you. I hope you feel the same security with me, because I really absolutely love you.
  <br><br>
  On December 21st, 2023, we spent the day at a mostly empty Adelphi and finished up your finals, and we were a bit all over each other. It’s incredibly hard to resist you, and it’s incredible really that it was still a productive day in the end. Though there was stress too, every moment close to you felt right. The next day,
  <br><br>
  On December 22nd, 2023, we went to get you plaid pajama pants. Somehow, no store was carrying any, but luckily I brought mine as backup. Like with Dollar Tree, it was really nice to run an errand with you, and especially to share more pieces of your life with you and to explore the stores and the area that are home to you.
  <br><br>
  On December 30th, 2023, we went to the Multiplex and watched Anyone But You, in a delightfully empty theatre again. One of the employees said we looked really good together. Some mormon on the sidewalk ran into us multiple times hours apart. We ate at Ihop and I saw some of Hillside, and we went to the library. We sat together comfortably and talked languages, and of books like Addie LaRue, which, darn I forgot about. It was really nice again to look at a piece of your life, especially your childhood. And it was really nice to talk about books you liked and reading you wanted to do. And you really glowed. I want to protect your light.
  <br><br>
  On December 31st, 2023, we celebrated the new year. You said it was actually a really nice New Year’s this time. Here’s to many more.
  `,
  11: `On January 3rd, 2024, we were going through it. Insecurities were surfacing. We had a call to talk about things, and it was difficult, and I let my own insecurities get the best of me. You were stronger than me and I think you always have been. The next day got better with some hiccup, but we were better and I found out that you imagine Rilakkuma as a creepy bloodthirsty bear with soulless empty eyes. But he’s cuter with a flower. Anyways, for all that I can’t do, thank you for staying with me. I’m truly sorry but I’ll do everything I can. I see a future with you, and you’re the first I can say that for, and you’re the only one I’ll ever say that for.
  <br><br>
  On January 12th, 2024, you visited my place. I tried to spruce up the place for your arrival and I was recommended to decorate a bit more. Apparently it was also really cute how excited I was. I ended up getting that wreath from Target… at least you didn’t notice it until the end. We finally built the lego money tree together, and we made onigiri and watched movies, including the final installment of the After series. Cuddling with you in bed just felt right. Cuddling you in bed felt like the rest of my life that I needed. Everything about being together in our private space felt right.
  <br><br>
  On January 26th, 2024, I panicked out of self-consciousness and felt bad in insecurity. You went great lengths to reassure me and let me know that you want me, that you love me for me, that I could be bald and 3 inches shorter and you’d still love me, that I’m your Remi and I’m as pretty as my heart and that’s all you see. And that you’d always be ready to reassure me.
  <br><br>
  On January 31st, 2024, I felt off and insecure again, and you reassured me again, and brought me happy tears again (did I mention you brought me to happy tears on the 26th?). Even though you had a literal panic attack that day you were so ready to support and reassure me fully too. And it’s not even the last time you would reassure me of my insecurities. But later on you would tell me again that it’s okay if I need it, that you’ll always be there with it, that you don’t want it to feel like a burden because it’s not. You are too too sweet dear.
  `,
  12: `On February 6th, 2024, we almost broke up. We were really going through it. Things were really hard. It seemed helpless at times. But we remained strong, and committed to each other in partnership and love. The problems we were facing were bigger than either of us, but we chose each other and to fight it together. We were in love. No one else sparks the same admiration and awe, inspires the same confidence, creates the same safety and comfort. We are in love. 
  <br><br>
  On February 10th, 2024, we struggled a little again. But we got to a good page: We are each other’s first love. We are each other’s first partner, true partners because we've found comfort and ease and support in each other. We’re each other’s first intimate, our first time intimately exploring and sharing bodies because we love each other and are comfortable with each other and want to express it and share in each other on more levels with a meaningful experience. We’re the first to truly see each other and love what we see on all levels. We’ll be each other’s first person to go end to end from wanting and fantasizing, to actual serious planning, to moving in together and realizing the fantasy and putting in the work to plan and make it happen and partner that way. We’ll be each other’s first time both wanting a cat and making sure everything at our place is prepped and we’re prepared and able and that we’re going to add another life to the household and love and raise it together.
  <br><br>
  On February 11th, 2024, we watched the Mean Girls remake and celebrated Chinese New Year with each other. We went to King Rufus Park at night, and in the winter it was pretty empty. We took cute pictures and made cute TikToks. We floated on a lowkey vibe. 
  <br><br>
  On February 14th, 2024, we shared Valentine’s Day at the Garden City Hotel and had a fine dining experience at the Red Salt Room. And we spent the next couple days together there. Finally again we had privacy and a whole room to ourselves. We got fancy chicken tendie room service and explored the hotel and snuck into places. We rewatched Insatiable and did a little bit of work and messed around. We even went to the hospital. And even when we were both exhausted, coffee candy could not compare at all to the energy gained just from being together. Even in exhaustion, it’s best to just be by your side. I spent every night wishing you could stay, that we could just sleep in the same bed together. I still wish for this every night. We talked more about intimacy and fears and got even closer. You made me feel reassured and comforted. Thank you for being so patient and understanding. It’s a wonderful thing about you.
  <br><br>
  On February 19th, 2024, we swapped outfits and we both slayed. Over the past several months and over the course of the next month, you would encourage me so much and give me so much confidence in myself.
  <br><br>
  On February 22nd, 2024, the mood was low but I wanted to see you still. I always want to see you. And I assured you of that. That I love you so much and always want to be with you. That I’ll always be there. We said screw other people and took over the music room again. I drove us to H-mart and you whipped us up a very nice dinner of buldak carbonara and tteokbokki, complemented by kimbap and banana milk. The night took a sadder turn at learning of something that happened, and
  <br><br>
  On February 23rd, 2024, I came to Adelphi worried, and you came silently. We sat a long time in silence. I kept grabbing your hands so you wouldn’t scratch yourself. We sat silently a long time. Eventually you leaned into my shoulder, and I cried. I wanna see you alright, and I want you to feel comfortable, and I want you to be able to take shelter in me. We didn’t really have words back then, and I still don’t. I just love you. But I’ll work on finding more words. At some point I fell asleep and had sleep paralysis. Immediately you made sure I was okay and gave me water to drink. 
  <br><br>
  On February 27th, 2024, insecurity and bad feelings struck again. We reaffirmed our love though. I’m glad to have been able to give reassurance as you do for me. And like you for me, I’m always here to do that, and it’s not a burden. I’m happy to reassure you and happy to make you feel better. We finally watched Stephanie Soo’s wedding video, and got more emotional. It’s comforting also to see their love as well and similarities in their experience. I just love you so much. That night, we felt a lot closer to each other.
  <br><br>
  On February 29th, 2024, we went figure skating.
  `,
};

var counter = new Set();

function dragstart() {}

function drag() {
  var rad = Math.atan2(d3.event.y, d3.event.x);
  var cos = Math.cos(rad);
  var sin = Math.sin(rad);

  d3.select(this).attr({
    x2: function (d) {
      //   console.log("x2", Math.cos(rad));
      return r * Math.cos(rad);
    },
    y2: function (d) {
      //   console.log("y2", Math.sin(rad));
      return r * Math.sin(rad);
    },
  });
  // I hate trig
  if (-rad < Math.PI / 3 && -rad >= Math.PI / 6) {
    $(".current").html(months[1]);
    counter.add(1);
  } else if (-rad < Math.PI / 6 && -rad >= 0) {
    $(".current").html(months[2]);
    counter.add(2);
  }

  if (rad >= 0 && rad < Math.PI / 6) {
    $(".current").html(months[3]);
    counter.add(3);
  }
  if (rad >= Math.PI / 6 && rad < Math.PI / 3) {
    $(".current").html(months[4]);
    counter.add(4);
  }
  if (rad >= Math.PI / 3 && rad < Math.PI / 2) {
    $(".current").html(months[5]);
    counter.add(5);
  }

  if (rad >= Math.PI / 2 && rad < (2 * Math.PI) / 3) {
    $(".current").html(months[6]);
    counter.add(6);
  }
  if (rad >= (2 * Math.PI) / 3 && rad < (5 * Math.PI) / 6) {
    $(".current").html(months[7]);
    counter.add(7);
  }
  if (rad >= (5 * Math.PI) / 6 && rad < Math.PI) {
    $(".current").html(months[8]);
    counter.add(8);
  }

  if (-rad < Math.PI && -rad >= (5 * Math.PI) / 6) {
    $(".current").html(months[9]);
    counter.add(9);
  }
  if (-rad < (5 * Math.PI) / 6 && -rad >= (2 * Math.PI) / 3) {
    $(".current").html(months[10]);
    counter.add(10);
  }
  if (-rad < (2 * Math.PI) / 3 && -rad >= Math.PI / 2) {
    $(".current").html(months[11]);
    counter.add(11);
  }
  if (-rad < Math.PI / 2 && -rad >= Math.PI / 3) {
    $(".current").html(months[12]);
    counter.add(12);
    if (counter.size >= 12) {
      $(".after")
        .html(`Do you remember that back on April 3rd, 2023, you asked me in my humble opinion, how long I thought the honeymoon phase of a relationship lasted? Back then, I said I didn’t know and it depended, but maybe a month. We agreed that the honeymoon was the period where everything is perfect and nothing can stop us because we’re happy, that reality hasn’t hit yet. And we agreed that that was fine, and that the ideal is knowing about reality, but still committing to and choosing each other to go through reality together and support each other and work together.
      <br><br>
      I remember in August, when I talked about learning Bangla for you, my coworker commented that the first month was the best and he would love to go back to that honeymoon phase. I remember in October, when I talked about our 3-month anniversary, my friend asked if this was the honeymoon phase. But as I keep telling you, I feel like our honeymoon is eternal. Because I keep falling more and more in love with you every day. And every day, I don’t think about going back to some moment or time before– I think that this day is my favorite day with you. Every day I feel so blessed and grateful to have you. I guess that is different from that honeymoon definition we talked about in April. But lo and behold, we’ve been hit with doses of reality, but we are still committed to and choosing each other. So whether we call it a honeymoon or not, we are in love and we are committed and this is where we need to be to go even further and even stronger.
      <br><br>
      History was made one year ago today. Now we get the joy of writing our future. I wouldn’t want it with anyone else. I love you darling.
      `);
    }
  }
}

function dragend() {}
