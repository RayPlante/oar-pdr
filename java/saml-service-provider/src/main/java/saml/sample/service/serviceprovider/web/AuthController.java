package saml.sample.service.serviceprovider.web;

import org.springframework.security.saml.SAMLCredential;
import org.springframework.security.saml.userdetails.SAMLUserDetailsService;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import saml.sample.service.serviceprovider.config.SecurityConstant;
import saml.sample.service.serviceprovider.domain.UserToken;

import java.security.Principal;
import java.util.List;

import org.joda.time.DateTime;
import org.opensaml.xml.XMLObject;
import org.opensaml.xml.schema.impl.XSAnyImpl;
//import org.opensaml.core.xml.schema.impl.XSAnyImpl;
import org.opensaml.core.xml.schema.impl.XSStringImpl;
import org.opensaml.saml2.core.Attribute;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author 
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    @GetMapping("/token")
    public UserToken token(Authentication authentication) throws JOSEException {

	
        final DateTime dateTime = DateTime.now();

       
        //build claims
        JWTClaimsSet.Builder jwtClaimsSetBuilder = new JWTClaimsSet.Builder();
        jwtClaimsSetBuilder.expirationTime(dateTime.plusMinutes(120).toDate());
        jwtClaimsSetBuilder.claim("APP", "SAMPLE");

        //signature
        SignedJWT signedJWT = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), jwtClaimsSetBuilder.build());
        signedJWT.sign(new MACSigner(SecurityConstant.JWT_SECRET));

        SAMLCredential credential = (SAMLCredential) authentication.getCredentials();
	List<Attribute> attributes = credential.getAttributes();
	//XMLObjectChildrenList<Attribute>  
	org.opensaml.xml.schema.impl.XSAnyImpl xsImpl = (XSAnyImpl) attributes.get(0).getAttributeValues().get(0);
	String userId = xsImpl.getTextContent();
	
        return new UserToken(userId, signedJWT.serialize());
    }
    
    @RequestMapping(value = "/username", method = RequestMethod.GET)
    @ResponseBody
    public String currentUserName(Principal principal) {
       return principal.getName();
    }
    

    @RequestMapping(value = "/credentials", method = RequestMethod.GET)
    @ResponseBody
    public String currentUserName(Authentication authentication) {
	//Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
	SAMLCredential credential1 = (SAMLCredential) authentication.getCredentials();
	//Assertion assertion = credential.getAuthenticationAssertion().getParent();
	SAMLCredential credential = (SAMLCredential) authentication.getCredentials();
	List<Attribute> attributes = credential.getAttributes();
	//XMLObjectChildrenList<Attribute>  
	org.opensaml.xml.schema.impl.XSAnyImpl xsImpl = (XSAnyImpl) attributes.get(0).getAttributeValues().get(0);
	String textContent = xsImpl.getTextContent();
//	XMLObject xmlObj = attributes.get(0).getAttributeValues().get(0).getParent();
//        Attribute attribute = credential.getAttribute("EmailAddress");
//        if (attribute != null) {
//            for (org.opensaml.xml.XMLObject object : attribute.getAttributeValues()) {
//                String value = ((XSStringImpl) object).getValue();
//                System.out.println("TEST:"+value);
//                }
//        }
        
	System.out.println("TEST:"+textContent);
       return authentication.getDetails().toString();
    }
}